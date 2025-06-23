DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'plots_db') THEN
    EXECUTE 'CREATE DATABASE plots_db';
  END IF;
END
$$;

DO $$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE rolname = 'plots_user'
   ) THEN
      CREATE ROLE plots_user WITH LOGIN PASSWORD 'Vikky98480';
      GRANT ALL PRIVILEGES ON DATABASE plots_db TO plots_user;
   END IF;
END
$$;