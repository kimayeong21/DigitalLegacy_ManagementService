ALTER TABLE memories ADD COLUMN ai_scene_type VARCHAR(120) NULL;
ALTER TABLE memories ADD COLUMN ai_atmosphere VARCHAR(120) NULL;
ALTER TABLE memories ADD COLUMN ai_felt_emotion VARCHAR(120) NULL;
ALTER TABLE memories ADD COLUMN ai_image_observations TEXT NULL;
ALTER TABLE memories ADD COLUMN ai_memory_meaning TEXT NULL;
ALTER TABLE memories ADD COLUMN ai_confidence DECIMAL(4,3) NULL;
