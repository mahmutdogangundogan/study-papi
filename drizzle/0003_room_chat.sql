CREATE TABLE "room_messages" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "room_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_messages_room_id_id_index" ON "room_messages" USING btree ("room_id","id");--> statement-breakpoint
-- Yeni mesajda realtime sunucusuna (src/realtime/server.mts) haber ver; odayı izleyenler son mesajları çeker
CREATE FUNCTION notify_room_message() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('room_message', NEW.room_id::text);
  RETURN NULL;
END $$;--> statement-breakpoint
CREATE TRIGGER room_messages_notify AFTER INSERT ON room_messages
  FOR EACH ROW EXECUTE FUNCTION notify_room_message();
