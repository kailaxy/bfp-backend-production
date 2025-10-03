-- Manual SQL INSERT statements for failed import records
-- These are the records that failed due to DD/MM/YYYY date format or malformed CSV lines

-- Record 1: Line 876 - 19/01/2018 (January 19, 2018)
INSERT INTO historical_fires (
    id, lat, lng, barangay, address, alarm_level, 
    reported_at, resolved_at, 
    casualties, injuries, estimated_damage, 
    cause, actions_taken, reported_by, verified_by, attachments
) VALUES (
    gen_random_uuid(), 
    14.5794 + (random() - 0.5) * 0.02, 
    121.0359 + (random() - 0.5) * 0.02, 
    'Wack Wack Greenhills', 
    'Ortigas Ilalim, Flyover, Mandaluyong City', 
    '1st Alarm',
    '2018-01-19 12:00:00', 
    '2018-01-19 12:01:00',
    0, 0, 0,
    'Unknown', 'Fire suppression (manual import)', 'BFP Manual Import', 'System Manual', '{}'
);

-- Record 2: Line 879 - 29/01/2018 (January 29, 2018)
INSERT INTO historical_fires (
    id, lat, lng, barangay, address, alarm_level, 
    reported_at, resolved_at, 
    casualties, injuries, estimated_damage, 
    cause, actions_taken, reported_by, verified_by, attachments
) VALUES (
    gen_random_uuid(), 
    14.5794 + (random() - 0.5) * 0.02, 
    121.0359 + (random() - 0.5) * 0.02, 
    'Wack Wack Greenhills', 
    'Ortigas Flyover, Mandaluyong City', 
    '1st Alarm',
    '2018-01-29 12:00:00', 
    '2018-01-29 12:01:00',
    0, 0, 0,
    'Unknown', 'Fire suppression (manual import)', 'BFP Manual Import', 'System Manual', '{}'
);

-- Record 3: Line 1184 - 22/01/2023 (January 22, 2023) 
INSERT INTO historical_fires (
    id, lat, lng, barangay, address, alarm_level, 
    reported_at, resolved_at, 
    casualties, injuries, estimated_damage, 
    cause, actions_taken, reported_by, verified_by, attachments
) VALUES (
    gen_random_uuid(), 
    14.5794 + (random() - 0.5) * 0.02, 
    121.0359 + (random() - 0.5) * 0.02, 
    'Plainview', 
    '#745 San Ignacio, Brgy. Plainview, Mandaluyong City', 
    '1st Alarm',
    '2023-01-22 12:00:00', 
    '2023-01-22 12:01:00',
    0, 0, 0,
    'Unknown', 'Fire suppression (manual import)', 'BFP Manual Import', 'System Manual', '{}'
);

-- Additional failed DD/MM/YYYY records from 2023-2024:

-- 18/01/2023
INSERT INTO historical_fires (
    id, lat, lng, barangay, address, alarm_level, 
    reported_at, resolved_at, 
    casualties, injuries, estimated_damage, 
    cause, actions_taken, reported_by, verified_by, attachments
) VALUES (
    gen_random_uuid(), 
    14.5794 + (random() - 0.5) * 0.02, 
    121.0359 + (random() - 0.5) * 0.02, 
    'Unknown Location', 
    'Unknown Location (DD/MM/YYYY format recovery)', 
    '1st Alarm',
    '2023-01-18 12:00:00', 
    '2023-01-18 12:01:00',
    0, 0, 0,
    'Unknown', 'Fire suppression (manual import)', 'BFP Manual Import', 'System Manual', '{}'
);

-- 26/01/2023
INSERT INTO historical_fires (
    id, lat, lng, barangay, address, alarm_level, 
    reported_at, resolved_at, 
    casualties, injuries, estimated_damage, 
    cause, actions_taken, reported_by, verified_by, attachments
) VALUES (
    gen_random_uuid(), 
    14.5794 + (random() - 0.5) * 0.02, 
    121.0359 + (random() - 0.5) * 0.02, 
    'Unknown Location', 
    'Unknown Location (DD/MM/YYYY format recovery)', 
    '1st Alarm',
    '2023-01-26 12:00:00', 
    '2023-01-26 12:01:00',
    0, 0, 0,
    'Unknown', 'Fire suppression (manual import)', 'BFP Manual Import', 'System Manual', '{}'
);

-- 24/02/2023
INSERT INTO historical_fires (
    id, lat, lng, barangay, address, alarm_level, 
    reported_at, resolved_at, 
    casualties, injuries, estimated_damage, 
    cause, actions_taken, reported_by, verified_by, attachments
) VALUES (
    gen_random_uuid(), 
    14.5794 + (random() - 0.5) * 0.02, 
    121.0359 + (random() - 0.5) * 0.02, 
    'Unknown Location', 
    'Unknown Location (DD/MM/YYYY format recovery)', 
    '1st Alarm',
    '2023-02-24 12:00:00', 
    '2023-02-24 12:01:00',
    0, 0, 0,
    'Unknown', 'Fire suppression (manual import)', 'BFP Manual Import', 'System Manual', '{}'
);

-- Sample 2024 records:

-- 17/01/2024
INSERT INTO historical_fires (
    id, lat, lng, barangay, address, alarm_level, 
    reported_at, resolved_at, 
    casualties, injuries, estimated_damage, 
    cause, actions_taken, reported_by, verified_by, attachments
) VALUES (
    gen_random_uuid(), 
    14.5794 + (random() - 0.5) * 0.02, 
    121.0359 + (random() - 0.5) * 0.02, 
    'Unknown Location', 
    'Unknown Location (DD/MM/YYYY format recovery)', 
    '1st Alarm',
    '2024-01-17 12:00:00', 
    '2024-01-17 12:01:00',
    0, 0, 0,
    'Unknown', 'Fire suppression (manual import)', 'BFP Manual Import', 'System Manual', '{}'
);

-- 29/12/2024 (Most recent failed record)
INSERT INTO historical_fires (
    id, lat, lng, barangay, address, alarm_level, 
    reported_at, resolved_at, 
    casualties, injuries, estimated_damage, 
    cause, actions_taken, reported_by, verified_by, attachments
) VALUES (
    gen_random_uuid(), 
    14.5794 + (random() - 0.5) * 0.02, 
    121.0359 + (random() - 0.5) * 0.02, 
    'Unknown Location', 
    'Unknown Location (DD/MM/YYYY format recovery)', 
    '1st Alarm',
    '2024-12-29 12:00:00', 
    '2024-12-29 12:01:00',
    0, 0, 0,
    'Unknown', 'Fire suppression (manual import)', 'BFP Manual Import', 'System Manual', '{}'
);

-- Note: These INSERT statements will add the essential ARIMA data (date + barangay + incident count)
-- The 'Unknown Location' barangay can be updated later if you can identify the specific locations
-- Random coordinates are generated within Mandaluyong City bounds
-- All other fields use synthetic defaults to satisfy database constraints