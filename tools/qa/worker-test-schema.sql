-- Run ONLY on a separate, empty fictional test DB after Django migrations.
-- Worker-only schema additions derived from repository query contracts.
-- This is not a production migration or a schema/data export.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS cf_sessions(token_hash text PRIMARY KEY,user_id uuid NOT NULL,device_info text NOT NULL DEFAULT '',expires_at timestamptz NOT NULL,last_seen_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS cf_ratelimit(key text PRIMARY KEY,count integer NOT NULL);
ALTER TABLE organizations_organization ADD COLUMN IF NOT EXISTS goals jsonb NOT NULL DEFAULT '[]';
ALTER TABLE menus_item ADD COLUMN IF NOT EXISTS is_special boolean NOT NULL DEFAULT false;
ALTER TABLE receptionist_booking ADD COLUMN IF NOT EXISTS table_label varchar(40) NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS menus_order(id uuid PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES workspaces_workspace(id),customer_name varchar(120) NOT NULL,customer_contact varchar(32) NOT NULL,notes text NOT NULL DEFAULT '',status varchar(20) NOT NULL,total_cents integer NOT NULL,request_key text NOT NULL DEFAULT '',created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS menus_order_request_unique ON menus_order(workspace_id,request_key) WHERE request_key<>'';
CREATE TABLE IF NOT EXISTS menus_orderitem(id uuid PRIMARY KEY,order_id uuid NOT NULL REFERENCES menus_order(id),item_id uuid NOT NULL REFERENCES menus_item(id),name varchar(120) NOT NULL,price_cents integer NOT NULL,quantity integer NOT NULL);
CREATE TABLE IF NOT EXISTS frontdesk_lead(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,name text NOT NULL,contact text NOT NULL,message text NOT NULL,stage text NOT NULL,value_cents integer NOT NULL,request_key text NOT NULL,created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,UNIQUE(workspace_id,request_key));
CREATE TABLE IF NOT EXISTS frontdesk_followup_draft(id uuid PRIMARY KEY,lead_id uuid NOT NULL,workspace_id uuid NOT NULL,body text NOT NULL,status text NOT NULL,created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS cf_media(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,filename text NOT NULL,mime text NOT NULL,size integer NOT NULL,data bytea NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE composer_post ADD COLUMN IF NOT EXISTS media_id uuid REFERENCES cf_media(id);
