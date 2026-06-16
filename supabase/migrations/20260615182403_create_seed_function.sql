CREATE OR REPLACE FUNCTION seed_user_data(uid uuid) RETURNS void AS $$
DECLARE
  fw_soc2 uuid;
  fw_iso uuid;
  fw_hipaa uuid;
  fw_gdpr uuid;
  ctrl_ids uuid[];
  c_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM frameworks WHERE user_id = uid) THEN
    RETURN;
  END IF;

  INSERT INTO frameworks (id, user_id, name, description, icon)
  VALUES (gen_random_uuid(), uid, 'SOC 2', 'Service Organization Control 2 - Trust Services Criteria', 'security')
  RETURNING id INTO fw_soc2;

  INSERT INTO frameworks (id, user_id, name, description, icon)
  VALUES (gen_random_uuid(), uid, 'ISO 27001', 'Information Security Management System standard', 'lock-private')
  RETURNING id INTO fw_iso;

  INSERT INTO frameworks (id, user_id, name, description, icon)
  VALUES (gen_random_uuid(), uid, 'HIPAA', 'Health Insurance Portability and Accountability Act', 'heart')
  RETURNING id INTO fw_hipaa;

  INSERT INTO frameworks (id, user_id, name, description, icon)
  VALUES (gen_random_uuid(), uid, 'GDPR', 'General Data Protection Regulation', 'globe')
  RETURNING id INTO fw_gdpr;

  INSERT INTO controls (user_id, framework_id, control_ref, title, description, status, risk_level, owner, last_assessed_at) VALUES
    (uid, fw_soc2, 'CC1.1', 'Control Environment', 'The entity demonstrates a commitment to integrity and ethical values', 'passing', 'low', 'Sarah Chen', now() - interval '5 days'),
    (uid, fw_soc2, 'CC1.2', 'Board Oversight', 'The board of directors demonstrates independence from management', 'passing', 'medium', 'Sarah Chen', now() - interval '10 days'),
    (uid, fw_soc2, 'CC2.1', 'Information Communication', 'Entity obtains or generates relevant quality information', 'failing', 'high', 'Mike Torres', now() - interval '2 days'),
    (uid, fw_soc2, 'CC3.1', 'Risk Assessment', 'Entity specifies objectives with sufficient clarity', 'passing', 'medium', 'Lisa Park', now() - interval '7 days'),
    (uid, fw_soc2, 'CC4.1', 'Monitoring Activities', 'Entity selects and performs ongoing evaluations', 'not_assessed', 'critical', 'James Wilson', null),
    (uid, fw_soc2, 'CC5.1', 'Control Activities', 'Entity selects and develops control activities', 'passing', 'low', 'Lisa Park', now() - interval '3 days'),
    (uid, fw_soc2, 'CC6.1', 'Logical Access', 'Entity implements logical access security measures', 'failing', 'critical', 'Mike Torres', now() - interval '1 day'),
    (uid, fw_soc2, 'CC7.1', 'System Operations', 'Entity detects and monitors system changes', 'passing', 'medium', 'James Wilson', now() - interval '15 days');

  INSERT INTO controls (user_id, framework_id, control_ref, title, description, status, risk_level, owner, last_assessed_at) VALUES
    (uid, fw_iso, 'A.5.1', 'Information Security Policy', 'Management direction for information security', 'passing', 'low', 'Sarah Chen', now() - interval '4 days'),
    (uid, fw_iso, 'A.6.1', 'Internal Organization', 'Framework to manage information security', 'passing', 'medium', 'Mike Torres', now() - interval '12 days'),
    (uid, fw_iso, 'A.7.1', 'Human Resource Security', 'Ensure employees understand responsibilities', 'not_assessed', 'high', 'Lisa Park', null),
    (uid, fw_iso, 'A.8.1', 'Asset Management', 'Identify and protect organizational assets', 'passing', 'medium', 'James Wilson', now() - interval '8 days'),
    (uid, fw_iso, 'A.9.1', 'Access Control', 'Limit access to information and processing facilities', 'failing', 'critical', 'Mike Torres', now() - interval '1 day'),
    (uid, fw_iso, 'A.10.1', 'Cryptography', 'Ensure proper use of cryptographic controls', 'passing', 'low', 'Sarah Chen', now() - interval '20 days');

  INSERT INTO controls (user_id, framework_id, control_ref, title, description, status, risk_level, owner, last_assessed_at) VALUES
    (uid, fw_hipaa, '164.308(a)(1)', 'Security Management', 'Implement policies to prevent security violations', 'passing', 'high', 'Lisa Park', now() - interval '6 days'),
    (uid, fw_hipaa, '164.308(a)(3)', 'Workforce Security', 'Ensure workforce members have appropriate access', 'failing', 'critical', 'Mike Torres', now() - interval '3 days'),
    (uid, fw_hipaa, '164.308(a)(5)', 'Security Awareness', 'Security awareness and training program', 'not_assessed', 'medium', 'Sarah Chen', null),
    (uid, fw_hipaa, '164.312(a)(1)', 'Access Control', 'Technical policies for electronic information systems', 'passing', 'high', 'James Wilson', now() - interval '9 days'),
    (uid, fw_hipaa, '164.312(e)(1)', 'Transmission Security', 'Technical measures to guard against unauthorized access', 'passing', 'medium', 'Mike Torres', now() - interval '14 days');

  INSERT INTO controls (user_id, framework_id, control_ref, title, description, status, risk_level, owner, last_assessed_at) VALUES
    (uid, fw_gdpr, 'Art.5', 'Data Processing Principles', 'Lawfulness, fairness, transparency of processing', 'passing', 'high', 'Sarah Chen', now() - interval '5 days'),
    (uid, fw_gdpr, 'Art.6', 'Lawful Basis', 'At least one lawful basis for processing', 'passing', 'medium', 'Lisa Park', now() - interval '11 days'),
    (uid, fw_gdpr, 'Art.25', 'Data Protection by Design', 'Implement appropriate measures in processing', 'failing', 'high', 'Mike Torres', now() - interval '2 days'),
    (uid, fw_gdpr, 'Art.32', 'Security of Processing', 'Implement appropriate technical measures', 'not_assessed', 'critical', 'James Wilson', null),
    (uid, fw_gdpr, 'Art.33', 'Breach Notification', 'Notify supervisory authority within 72 hours', 'passing', 'medium', 'Sarah Chen', now() - interval '18 days');

  SELECT array_agg(id) INTO ctrl_ids FROM (
    SELECT id FROM controls WHERE user_id = uid ORDER BY created_at LIMIT 8
  ) sub;

  INSERT INTO evidence (user_id, control_id, title, description, status, uploaded_at) VALUES
    (uid, ctrl_ids[1], 'Code of Conduct Policy', 'Annual employee code of conduct acknowledgment', 'approved', now() - interval '3 days'),
    (uid, ctrl_ids[1], 'Ethics Training Records', 'Q1 2025 ethics training completion report', 'approved', now() - interval '10 days'),
    (uid, ctrl_ids[2], 'Board Meeting Minutes', 'Q4 2024 board oversight meeting minutes', 'approved', now() - interval '15 days'),
    (uid, ctrl_ids[3], 'Communication Audit Report', 'Internal communication effectiveness assessment', 'rejected', now() - interval '1 day'),
    (uid, ctrl_ids[4], 'Risk Assessment Matrix', 'Annual risk assessment document', 'pending', now() - interval '2 days'),
    (uid, ctrl_ids[5], 'Monitoring Dashboard Config', 'System monitoring configuration export', 'pending', now() - interval '4 days'),
    (uid, ctrl_ids[6], 'Penetration Test Report', 'Annual third-party penetration test findings', 'approved', now() - interval '7 days'),
    (uid, ctrl_ids[7], 'Access Control Matrix', 'Role-based access control documentation', 'approved', now() - interval '5 days'),
    (uid, ctrl_ids[8], 'System Architecture Diagram', 'Current system architecture and data flow', 'pending', now() - interval '6 days');

  INSERT INTO audits (user_id, framework_id, title, status, start_date, end_date, notes) VALUES
    (uid, fw_soc2, 'SOC 2 Type II Annual Audit 2025', 'in_progress', '2025-01-15', '2025-06-30', 'Annual SOC 2 Type II audit with Deloitte'),
    (uid, fw_iso, 'ISO 27001 Surveillance Audit', 'not_started', '2025-07-01', '2025-08-15', 'Annual surveillance audit for ISO certification'),
    (uid, fw_hipaa, 'HIPAA Compliance Assessment Q2', 'completed', '2025-03-01', '2025-04-30', 'Quarterly HIPAA compliance assessment completed'),
    (uid, fw_gdpr, 'GDPR Annual Review 2025', 'in_progress', '2025-02-01', '2025-05-31', 'Annual review of GDPR compliance measures');

  INSERT INTO vendors (user_id, name, risk_score, status, last_reviewed_at, notes) VALUES
    (uid, 'AWS', 25, 'approved', now() - interval '30 days', 'SOC 2 Type II and ISO 27001 certified'),
    (uid, 'Datadog', 30, 'approved', now() - interval '45 days', 'Monitoring provider, SOC 2 compliant'),
    (uid, 'Stripe', 20, 'approved', now() - interval '60 days', 'PCI DSS Level 1 certified payment processor'),
    (uid, 'Zendesk', 45, 'under_review', now() - interval '90 days', 'Support platform, due for annual review'),
    (uid, 'Acme Analytics', 72, 'flagged', now() - interval '120 days', 'Missing SOC 2 report, elevated risk score'),
    (uid, 'CloudSync Pro', 58, 'under_review', now() - interval '15 days', 'New vendor, security review in progress'),
    (uid, 'DocuSign', 22, 'approved', now() - interval '35 days', 'FedRAMP authorized, SOC 1/2 compliant');

  INSERT INTO policies (user_id, framework_id, title, version, status, content, last_reviewed_at) VALUES
    (uid, fw_soc2, 'Information Security Policy', '3.2', 'published', 'This policy establishes the framework for managing information security across the organization...', now() - interval '20 days'),
    (uid, fw_soc2, 'Acceptable Use Policy', '2.1', 'published', 'This policy defines acceptable use of company technology resources and systems...', now() - interval '30 days'),
    (uid, fw_iso, 'Risk Management Policy', '1.5', 'in_review', 'This policy outlines the approach to identifying, assessing, and managing information security risks...', now() - interval '5 days'),
    (uid, fw_hipaa, 'Data Privacy Policy', '4.0', 'published', 'This policy governs the collection, use, and protection of personal health information...', now() - interval '15 days'),
    (uid, fw_gdpr, 'Data Retention Policy', '2.0', 'draft', 'This policy defines retention periods for different categories of personal data...', now() - interval '2 days'),
    (uid, fw_gdpr, 'Incident Response Plan', '3.1', 'published', 'This plan outlines procedures for detecting, responding to, and recovering from security incidents...', now() - interval '25 days'),
    (uid, NULL, 'Employee Handbook - Security', '5.0', 'in_review', 'Security-related sections of the employee handbook covering security awareness and responsibilities...', now() - interval '8 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
