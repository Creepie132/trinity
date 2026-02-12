-- Import clients for beautymania organization
-- Find org_id first
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get beautymania org_id
  SELECT id INTO v_org_id
  FROM organizations
  WHERE LOWER(name) LIKE '%beauty%'
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization beautymania not found!';
  END IF;
  
  RAISE NOTICE 'Found organization ID: %', v_org_id;
  
  -- Insert clients (sample - you can add more)
  INSERT INTO clients (org_id, first_name, last_name, phone, email, address, date_of_birth, notes)
  VALUES
    -- Row 1
    (v_org_id, 'Елена', 'Бобровицкая', '537268565', null, 'Yefe Nof St 31 Ashkelon', '2026-01-08', 'Источник: Facebook. Последний визит: 2026-01-08'),
    
    -- Row 2
    (v_org_id, 'Натали', 'Верховски', '534214164', null, 'Goldberg ha-Nadvan St 14 Rishon LeZion', '2026-01-08', 'Источник: Facebook. Последний визит: 2026-01-08'),
    
    -- Row 3
    (v_org_id, 'Диана', 'Фурман', '546354076', null, 'Derech Dganya 84 6 Netanya', '2026-01-05', 'Последний визит: 2026-01-05'),
    
    -- Row 4
    (v_org_id, 'Влад', 'Халфин', '544858586', null, 'Lakhish St 3 Ashkelon', null, null),
    
    -- Row 5
    (v_org_id, 'Женя', 'Ярусская', '546122467', null, 'דרך הים 96 Ashkelon', null, 'Источник: Лично'),
    
    -- Row 6
    (v_org_id, 'Александра', 'Гринкруг', '504865949', null, 'Nahman Syrkin St 19/11 Ashdod', null, 'Источник: Facebook'),
    
    -- Row 7
    (v_org_id, 'Ирина', 'Чинонова', '559898283', null, 'Pki''in St 6/14 Ashkelon', null, 'Источник: личное знакомство'),
    
    -- Row 8
    (v_org_id, 'Сабина', 'Сабина', '559724118', null, 'Meron St 17 1 Karmiel', null, 'Источник: Facebook'),
    
    -- Row 9
    (v_org_id, 'Марианна', 'Садовская', '539649919', null, 'Petakh Tikva St 11 Ashdod 7765772', null, 'Источник: Facebook'),
    
    -- Row 10
    (v_org_id, 'Людмила', 'Шишело', '534310488', null, 'Bialik St 17 3 Ra''anana', null, 'Источник: Facebook'),
    
    -- Row 11
    (v_org_id, 'Натали', 'Бакланов', '542438316', null, 'Zeev Jabotinsky St Ramat Gan', null, 'Источник: Facebook'),
    
    -- Row 12
    (v_org_id, 'Таня', 'Ройтман', '542116466', null, 'Sokolov St 132 1 Holon', null, 'Источник: Facebook'),
    
    -- Row 13
    (v_org_id, 'Инна', 'Данич', '528898757', null, 'נעמי שמר 8 חולון', null, 'Источник: Facebook'),
    
    -- Row 14
    (v_org_id, 'Алона', 'Редкина', '546538120', null, 'Har Metsada St 95 Ashdod', null, 'Источник: Facebook'),
    
    -- Row 15
    (v_org_id, 'Евгения', 'Меламед', '543673277', null, 'Shlomo ha-Melekh St 5 Ashdod', null, null),
    
    -- Row 16
    (v_org_id, 'Руфина', 'Светлицкий', '547659880', null, 'Yehoshu''a Bin Nun St 21 Ofakim', null, 'Источник: Facebook'),
    
    -- Row 17
    (v_org_id, 'Алёна', 'Авруцкая', '528097070', null, 'Arlozorov St 21 Ashdod', '1984-07-31', 'Источник: Facebook'),
    
    -- Row 18
    (v_org_id, 'Татьяна', 'Щербич', '544413029', null, 'Bayit Vagan St 15 Bat Yam', '1976-11-05', 'Источник: Facebook'),
    
    -- Row 19
    (v_org_id, 'Ирина', 'Карцемский', '502339450', null, 'Nordau St 1 Ness Ziona', '1970-04-29', 'Источник: Facebook')
    
  ON CONFLICT (org_id, phone) DO NOTHING;
  
  RAISE NOTICE 'Import completed!';
END $$;

-- Count total clients
SELECT COUNT(*) as total_clients FROM clients 
WHERE org_id IN (SELECT id FROM organizations WHERE LOWER(name) LIKE '%beauty%');
