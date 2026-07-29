-- LifePrint — PostgreSQL migration for the future server version.
-- The shipping app is browser-only; this schema is the target shape of the same
-- model once accounts and sync exist. Nothing in the static app reads this file.
--
-- Conventions: UUID primary keys, timestamptz everywhere, ON DELETE CASCADE from
-- the owning user, and enums for the small closed vocabularies the engine relies on.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------- enums
CREATE TYPE ruling_status     AS ENUM ('eat_freely', 'moderation', 'occasional', 'avoid');
CREATE TYPE confidence_level  AS ENUM ('low', 'moderate', 'high');
CREATE TYPE restriction_kind  AS ENUM ('allergy', 'intolerance', 'religious', 'ethical',
                                       'medical', 'preference', 'dislike', 'non_negotiable');
CREATE TYPE finding_status    AS ENUM ('needs_confirmation', 'confirmed', 'downgraded', 'deleted');
CREATE TYPE source_kind       AS ENUM ('medical_allergy', 'clinician_instruction',
                                       'diagnosed_intolerance', 'religious_restriction',
                                       'report_finding', 'framework_exclusion',
                                       'user_observed', 'preference');
CREATE TYPE safety_level      AS ENUM ('urgent', 'stop', 'caution');
CREATE TYPE check_status      AS ENUM ('pass', 'warn', 'fail');
CREATE TYPE export_variant    AS ENUM ('standard', 'printer', 'mobile');
CREATE TYPE fodmap_level      AS ENUM ('low', 'moderate', 'high', 'unknown');

-- ---------------------------------------------------------------- 1. users
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz
);

-- ---------------------------------------------------------------- 2. profiles
CREATE TABLE profiles (
  user_id          uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name       text NOT NULL,
  age              int CHECK (age BETWEEN 13 AND 110),
  sex              text,
  height_cm        numeric(5,1),
  weight_kg        numeric(5,1),
  goal_weight_kg   numeric(5,1),
  occupation       text,
  activity_level   text,
  cooking_skill    text,
  household_size   int NOT NULL DEFAULT 1 CHECK (household_size BETWEEN 1 AND 12),
  budget           text,
  time_per_meal    int,
  batch_window     int,
  stores           text[] NOT NULL DEFAULT '{}',
  equipment        text[] NOT NULL DEFAULT '{}',
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- 3. goals
CREATE TABLE goals (
  id     text PRIMARY KEY,
  label  text NOT NULL,
  blurb  text
);

-- ---------------------------------------------------------------- 4. user_goals
CREATE TABLE user_goals (
  user_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  goal_id  text REFERENCES goals(id),
  rank     int,                        -- 1..3 for ranked priorities, NULL otherwise
  custom   text,                       -- free text when goal_id = 'custom-goal'
  PRIMARY KEY (user_id, goal_id)
);

-- ---------------------------------------------------------------- 5. frameworks
CREATE TABLE frameworks (
  id                text PRIMARY KEY,
  name              text NOT NULL,
  short             text NOT NULL,
  blurb             text NOT NULL,
  exclude_markers   text[] NOT NULL DEFAULT '{}',
  limit_markers     text[] NOT NULL DEFAULT '{}',
  emphasize         text[] NOT NULL DEFAULT '{}',
  protein_floor_g   int,
  guidance          text,
  meal_notes        text,
  supervision       text,
  eliminates_groups text[] NOT NULL DEFAULT '{}'
);

-- ---------------------------------------------------------------- 6. user_frameworks
CREATE TABLE user_frameworks (
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  framework_id  text REFERENCES frameworks(id),
  free_text     text,                  -- custom framework / clinician instructions
  added_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, framework_id)
);

-- ---------------------------------------------------------------- 7. framework_conflicts
CREATE TABLE framework_conflicts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  framework_ids     text[] NOT NULL,
  severity          safety_level NOT NULL,
  surviving_foods   int NOT NULL,
  detail            text NOT NULL,
  resolution        text,              -- adjust | keep | supervision
  acknowledged_at   timestamptz
);

-- ---------------------------------------------------------------- 8. foods
CREATE TABLE foods (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  category    text NOT NULL,
  aisle       text NOT NULL,
  fodmap      fodmap_level NOT NULL DEFAULT 'unknown',
  prep_notes  text,
  serving     text,
  calories    int,
  protein_g   numeric(5,1),
  tags        text[] NOT NULL DEFAULT '{}'
);
CREATE INDEX foods_category_idx ON foods (category);
CREATE INDEX foods_aisle_idx    ON foods (aisle);

-- ---------------------------------------------------------------- 9. food_aliases
CREATE TABLE food_aliases (
  food_id  text REFERENCES foods(id) ON DELETE CASCADE,
  alias    text NOT NULL,
  PRIMARY KEY (food_id, alias)
);
CREATE INDEX food_aliases_alias_idx ON food_aliases (lower(alias));

-- ---------------------------------------------------------------- 10. food_markers
CREATE TABLE food_markers (
  food_id  text REFERENCES foods(id) ON DELETE CASCADE,
  marker   text NOT NULL,             -- gluten, dairy, treeNut, nightshade, …
  value    boolean NOT NULL,
  PRIMARY KEY (food_id, marker)
);

-- ---------------------------------------------------------------- 11. food_framework_rulings
CREATE TABLE food_framework_rulings (
  food_id       text REFERENCES foods(id) ON DELETE CASCADE,
  framework_id  text REFERENCES frameworks(id) ON DELETE CASCADE,
  ruling        text NOT NULL CHECK (ruling IN ('yes', 'limit', 'no')),
  PRIMARY KEY (food_id, framework_id)
);

-- ---------------------------------------------------------------- 12. food_substitutes
CREATE TABLE food_substitutes (
  food_id        text REFERENCES foods(id) ON DELETE CASCADE,
  substitute_id  text REFERENCES foods(id) ON DELETE CASCADE,
  rank           int NOT NULL DEFAULT 1,
  PRIMARY KEY (food_id, substitute_id),
  CHECK (food_id <> substitute_id)
);

-- ---------------------------------------------------------------- 13. user_restrictions
CREATE TABLE user_restrictions (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id   text REFERENCES foods(id),
  raw_text  text NOT NULL,            -- what the user typed, kept verbatim
  kind      restriction_kind NOT NULL,
  severity  text,                     -- e.g. 'anaphylaxis'
  note      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_restrictions_user_idx ON user_restrictions (user_id, kind);

-- ---------------------------------------------------------------- 14. documents
CREATE TABLE documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  kind        text NOT NULL,          -- pasted | txt | md | pdf
  char_count  int NOT NULL DEFAULT 0,
  added_at    timestamptz NOT NULL DEFAULT now()
  -- NOTE: document contents are intentionally not stored, here or in the browser.
);

-- ---------------------------------------------------------------- 15. findings
CREATE TABLE findings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id       uuid REFERENCES documents(id) ON DELETE SET NULL,
  food_id           text REFERENCES foods(id),
  raw_food          text NOT NULL,
  severity          text,
  source_kind       source_kind NOT NULL,
  source_reference  text,             -- e.g. 'IgG panel, page 2'
  confidence        confidence_level NOT NULL DEFAULT 'low',
  status            finding_status NOT NULL DEFAULT 'needs_confirmation',
  reviewed_at       timestamptz
);
CREATE INDEX findings_user_status_idx ON findings (user_id, status);

-- ---------------------------------------------------------------- 16. rulings
CREATE TABLE rulings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id           text NOT NULL REFERENCES foods(id),
  status            ruling_status NOT NULL,
  reason            text NOT NULL,
  source_kind       source_kind NOT NULL,
  source_reference  text,
  confidence        confidence_level NOT NULL,
  precedence        int NOT NULL CHECK (precedence BETWEEN 1 AND 8),
  temporary         boolean NOT NULL DEFAULT false,
  reintroducible    boolean NOT NULL DEFAULT false,
  hard_exclusion    boolean NOT NULL DEFAULT false,
  computed_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, food_id)
);

-- ---------------------------------------------------------------- 17. recipes
CREATE TABLE recipes (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  cuisine       text,
  servings      int NOT NULL,
  prep_minutes  int,
  cook_minutes  int,
  equipment     text[] NOT NULL DEFAULT '{}',
  steps         text[] NOT NULL DEFAULT '{}',
  storage       text,
  batch_notes   text,
  tags          text[] NOT NULL DEFAULT '{}'
);

-- ---------------------------------------------------------------- 18. recipe_ingredients
CREATE TABLE recipe_ingredients (
  recipe_id  text REFERENCES recipes(id) ON DELETE CASCADE,
  food_id    text REFERENCES foods(id),
  amount     text NOT NULL,           -- '1 cup', '8 oz'
  position   int NOT NULL,
  optional   boolean NOT NULL DEFAULT false,
  PRIMARY KEY (recipe_id, position)
);

-- ---------------------------------------------------------------- 19. meal_plans
CREATE TABLE meal_plans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  days           int NOT NULL,
  meals_per_day  int NOT NULL CHECK (meals_per_day BETWEEN 1 AND 6),
  avg_calories   int,
  avg_protein_g  int,
  seed           bigint NOT NULL,     -- generation is deterministic given the seed
  generated_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- 20. meal_plan_meals
CREATE TABLE meal_plan_meals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id  uuid NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  day_index     int NOT NULL,
  slot          text NOT NULL,        -- breakfast | lunch | dinner | snack
  recipe_id     text REFERENCES recipes(id),
  plate_json    jsonb,                -- component plate when no recipe is used
  est_calories  int,
  est_protein_g int,
  UNIQUE (meal_plan_id, day_index, slot)
);

-- ---------------------------------------------------------------- 21. grocery_items
CREATE TABLE grocery_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id  uuid NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  food_id       text REFERENCES foods(id),
  aisle         text NOT NULL,
  quantity      text NOT NULL,
  uses          int NOT NULL DEFAULT 1
);
CREATE INDEX grocery_items_plan_aisle_idx ON grocery_items (meal_plan_id, aisle);

-- ---------------------------------------------------------------- 22. books
CREATE TABLE books (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_plan_id    uuid REFERENCES meal_plans(id) ON DELETE SET NULL,
  title           text NOT NULL,
  subtitle        text,
  theme           text NOT NULL,
  tone            text NOT NULL,
  depth           text NOT NULL,      -- brief | standard | deep | complete
  target_pages    int NOT NULL,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  stale           boolean NOT NULL DEFAULT false,
  stale_reason    text,
  stats           jsonb NOT NULL DEFAULT '{}'::jsonb,
  edits           jsonb NOT NULL DEFAULT '{}'::jsonb,
  variants        jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ---------------------------------------------------------------- 23. book_chapters
CREATE TABLE book_chapters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id      uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_key  text NOT NULL,
  title        text NOT NULL,
  position     int NOT NULL,
  locked       boolean NOT NULL DEFAULT false,
  custom       boolean NOT NULL DEFAULT false,
  blocks       jsonb NOT NULL,        -- the block model rendered by screen and PDF alike
  UNIQUE (book_id, position)
);

-- ------------------------------------------------- supporting tables
CREATE TABLE safety_flags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_key     text NOT NULL,
  level        safety_level NOT NULL,
  title        text NOT NULL,
  body         text NOT NULL,
  action       text NOT NULL,
  requires_ack boolean NOT NULL DEFAULT false,
  raised_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE safety_acknowledgements (
  flag_id         uuid REFERENCES safety_flags(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (flag_id, user_id)
);

CREATE TABLE validation_runs (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id   uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  ran_at    timestamptz NOT NULL DEFAULT now(),
  passed    int NOT NULL,
  warned    int NOT NULL,
  failed    int NOT NULL
);

CREATE TABLE validation_checks (
  run_id  uuid REFERENCES validation_runs(id) ON DELETE CASCADE,
  key     text NOT NULL,
  label   text NOT NULL,
  status  check_status NOT NULL,
  detail  text,
  PRIMARY KEY (run_id, key)
);

CREATE TABLE exports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  variant     export_variant NOT NULL,
  pages       int NOT NULL,
  filename    text NOT NULL,
  exported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trackers (
  id       text PRIMARY KEY,
  name     text NOT NULL,
  columns  text[] NOT NULL
);

CREATE TABLE tracker_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tracker_id  text NOT NULL REFERENCES trackers(id),
  entry_date  date NOT NULL,
  values      jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tracker_entries_user_idx ON tracker_entries (user_id, tracker_id, entry_date);

COMMIT;
