CREATE OR REPLACE FUNCTION notify_project_update()
RETURNS TRIGGER AS $$
DECLARE
    payload TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT json_build_object(
            'action', 'insert',
            'id', NEW.id
        )::TEXT INTO payload;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT json_build_object(
            'action', 'delete',
            'id', OLD.id
        )::TEXT INTO payload;
    END IF;

    PERFORM pg_notify('project_updated', payload);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_project
    AFTER INSERT OR DELETE ON project
    FOR EACH ROW
    EXECUTE FUNCTION notify_project_update();
