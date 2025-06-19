CREATE EXTENSION IF NOT EXISTS postgres_fdw;

CREATE SERVER IF NOT EXISTS labelstudio
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (dbname 'label-studio');

CREATE USER MAPPING FOR PUBLIC SERVER labelstudio
    OPTIONS (
        user 'postgres'
    );

IMPORT FOREIGN SCHEMA public
    LIMIT TO (project)
    FROM SERVER labelstudio
    INTO public;
ALTER FOREIGN TABLE project RENAME TO project_ft;

/** Project local cache table */
CREATE TABLE project_cache(
    id INTEGER PRIMARY KEY,
    title TEXT
);

CREATE TABLE project_ml_models_relation (
    project_id INTEGER,
    model_id INTEGER,
    FOREIGN KEY (project_id) REFERENCES project_cache(id),
    FOREIGN KEY (model_id) REFERENCES ml_models(id)
);

/** cron syncing project cache */
SELECT cron.schedule('0 * * * *',
    $$
    INSERT INTO project_cache
    SELECT id, title
    FROM project_ft
    ON CONFLICT (id) DO NOTHING;
    $$
);
