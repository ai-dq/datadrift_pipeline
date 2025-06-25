CREATE EXTENSION IF NOT EXISTS postgres_fdw;

CREATE SERVER IF NOT EXISTS labelstudio
    FOREIGN DATA WRAPPER postgres_fdw
<<<<<<< Updated upstream
    OPTIONS (dbname 'labelstudio');
=======
    OPTIONS (
        dbname '{{LABEL_STUDIO_DB_NAME}}'
    );
>>>>>>> Stashed changes

CREATE USER MAPPING IF NOT EXISTS FOR PUBLIC SERVER labelstudio
    OPTIONS (
        user '{{POSTGRE_USER}}'
    );

DO $$
BEGIN
    -- Check if project_ft already exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_ft' AND table_schema = 'public') THEN
        -- Import and rename the foreign table
        IMPORT FOREIGN SCHEMA public
            LIMIT TO (project)
            FROM SERVER labelstudio
            INTO public;
        ALTER FOREIGN TABLE project RENAME TO project_ft;
    END IF;
END $$;

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
