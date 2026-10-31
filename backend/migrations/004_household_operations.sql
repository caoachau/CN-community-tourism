-- Additive request lifecycle. Existing bookings and deadlines are unchanged.
ALTER TABLE schedule_requests
  ADD COLUMN base_reservation_set_id BIGINT UNSIGNED NULL,
  ADD COLUMN closed_at DATETIME(6) NULL,
  ADD COLUMN closed_by BIGINT UNSIGNED NULL,
  ADD COLUMN resolution_code VARCHAR(40) NULL,
  ADD COLUMN active_cancel_booking_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN request_kind = 'BOOKING_CANCEL' AND status = 'OPEN' THEN booking_id ELSE NULL END) STORED,
  ADD UNIQUE KEY uq_requests_active_cancel (active_cancel_booking_id),
  DROP CHECK ck_requests_kind,
  DROP CHECK ck_requests_target,
  DROP CHECK ck_requests_customer,
  ADD CONSTRAINT ck_requests_kind CHECK (request_kind IN ('PRIVATE_SCHEDULE','SERVICE_INQUIRY','BOOKING_CHANGE','BOOKING_CANCEL')),
  ADD CONSTRAINT ck_requests_target CHECK ((request_kind IN ('BOOKING_CHANGE','BOOKING_CANCEL') AND booking_id IS NOT NULL AND service_id IS NULL) OR (request_kind = 'SERVICE_INQUIRY' AND booking_id IS NULL AND service_id IS NOT NULL) OR (request_kind = 'PRIVATE_SCHEDULE' AND booking_id IS NULL AND service_id IS NULL)),
  ADD CONSTRAINT ck_requests_customer CHECK (customer_user_id IS NOT NULL OR (request_kind IN ('BOOKING_CHANGE','BOOKING_CANCEL') AND created_by IS NOT NULL AND contact_snapshot IS NOT NULL)),
  ADD CONSTRAINT ck_requests_cancel CHECK (request_kind <> 'BOOKING_CANCEL' OR (base_reservation_set_id IS NOT NULL AND status IN ('OPEN','ACCEPTED','WITHDRAWN','CLOSED') AND first_hold_started_at IS NULL AND initial_hold_deadline IS NULL));
ALTER TABLE schedule_requests ADD CONSTRAINT fk_requests_base_set FOREIGN KEY (base_reservation_set_id,booking_id,household_id) REFERENCES reservation_sets (id,booking_id,household_id);
ALTER TABLE schedule_requests ADD CONSTRAINT fk_requests_closed_by FOREIGN KEY (closed_by) REFERENCES users (id);
