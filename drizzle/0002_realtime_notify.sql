-- Timer ya da oda üyeliği değişince realtime sunucusuna (src/realtime/server.mts) haber ver.
-- Değişikliği kim yaparsa yapsın (action, otomatik durdurma, seed) bildirim commit anında gider.
CREATE FUNCTION notify_timer_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('timer_changed', coalesce(NEW.user_id, OLD.user_id)::text);
  RETURN NULL;
END $$;--> statement-breakpoint
CREATE TRIGGER study_sessions_notify AFTER INSERT OR UPDATE OR DELETE ON study_sessions
  FOR EACH ROW EXECUTE FUNCTION notify_timer_changed();--> statement-breakpoint
CREATE FUNCTION notify_room_members_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('room_members_changed', coalesce(NEW.room_id, OLD.room_id)::text);
  RETURN NULL;
END $$;--> statement-breakpoint
CREATE TRIGGER room_members_notify AFTER INSERT OR UPDATE OR DELETE ON room_members
  FOR EACH ROW EXECUTE FUNCTION notify_room_members_changed();
