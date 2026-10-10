import { randomUUID } from 'node:crypto';

// Test-only inserts. Values are parameterised; identifiers come from this module.
export async function insert(connection, table, values) {
  const columns = Object.keys(values);
  if (![table, ...columns].every((name) => /^[a-z_]+$/.test(name))) throw new Error('Invalid fixture identifier');
  const [result] = await connection.execute(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    Object.values(values).map((value) => value !== null && typeof value === 'object' && !Buffer.isBuffer(value) ? JSON.stringify(value) : value),
  );
  return String(result.insertId);
}

export async function seedBase(connection) {
  const timestamp = '2030-01-01 00:00:00.000000';
  const users = {};
  for (const [name, role] of [['admin', 'ADMIN'], ['customer', 'CUSTOMER'], ['ownerA', 'HOUSEHOLD'], ['ownerB', 'HOUSEHOLD']]) {
    users[name] = await insert(connection, 'users', {
      email: `${name.toLowerCase()}@fixture.invalid`, display_name: `Fixture ${name}`,
      password_hash: '!TEST_ONLY_NO_LOGIN!', role, updated_at: timestamp,
    });
  }
  const households = {};
  for (const name of ['A', 'B']) {
    households[name] = await insert(connection, 'households', {
      owner_user_id: users[`owner${name}`], code: `FIXTURE_${name}`,
      approval_status: 'APPROVED', updated_at: timestamp,
    });
  }
  const category = await insert(connection, 'service_categories', { code: 'AGRICULTURE', name: 'Trải nghiệm nông nghiệp' });
  const rooms = {};
  const services = {};
  for (const name of ['A', 'B']) {
    rooms[name] = await insert(connection, 'rooms', {
      household_id: households[name], code: 'SEN', max_guests: 4, nightly_price_vnd: '400000',
    });
    services[name] = await insert(connection, 'services', {
      household_id: households[name], code: 'FISHING', category_id: category, default_duration_minutes: 180,
    });
  }
  const offers = {};
  for (const [name, mode, pricing, price] of [
    ['shared', 'SHARED', 'PER_PERSON', '150000'], ['exclusive', 'EXCLUSIVE', 'PER_TRIP', '600000'],
  ]) {
    offers[name] = await insert(connection, 'service_offers', {
      household_id: households.A, service_id: services.A, name,
      participation_mode: mode, pricing_type: pricing, unit_price_vnd: price,
      unit_label: pricing === 'PER_PERSON' ? 'người' : 'chuyến',
      min_participants: 1, max_participants: 10, terms: {},
    });
  }
  const slot = await insert(connection, 'service_slots', {
    household_id: households.A, service_id: services.A,
    starts_at: '2030-11-20 07:00:00', ends_at: '2030-11-20 10:00:00',
    person_capacity: 10, sales_status: 'OPEN', created_by: users.ownerA,
  });
  const slotOffers = {};
  for (const name of ['shared', 'exclusive']) {
    slotOffers[name] = await insert(connection, 'slot_offers', {
      household_id: households.A, service_id: services.A, slot_id: slot, offer_id: offers[name],
    });
  }
  const resources = {};
  const assignments = {};
  for (const [name, type, quantity, mode] of [
    ['boat', 'SINGLE', 1, 'SESSION_SHARED'], ['bikes', 'POOL', 10, 'PER_BOOKING_QUOTA'],
  ]) {
    resources[name] = await insert(connection, 'resources', {
      household_id: households.A, code: name.toUpperCase(), name,
      resource_type: type, total_quantity: quantity,
    });
    assignments[name] = await insert(connection, 'slot_resource_assignments', {
      household_id: households.A, slot_id: slot, resource_id: resources[name],
      quantity, allocation_mode: mode,
    });
  }
  return { users, households, category, rooms, services, offers, slot, slotOffers, resources, assignments };
}

export async function seedBooking(connection, base, overrides = {}) {
  const booking = await insert(connection, 'bookings', {
    household_id: base.households.A, booking_code: `T-${randomUUID()}`,
    customer_user_id: base.users.customer, created_by: base.users.customer,
    source: 'ONLINE', status: 'CONFIRMED', contact_name: 'Khách kiểm thử', contact_phone: '0000000000',
    first_starts_at: '2030-11-20 07:00:00', last_ends_at: '2030-11-20 10:00:00',
    total_vnd: '300000', terms_snapshot: {}, confirmed_at: '2030-11-19 00:00:00',
    ...overrides,
  });
  const reservationSet = await insert(connection, 'reservation_sets', {
    household_id: base.households.A, booking_id: booking, status: 'COMMITTED',
  });
  return { booking, reservationSet };
}

export async function seedServiceItem(connection, base, booking, overrides = {}) {
  const reservation = await insert(connection, 'slot_reservations', {
    household_id: base.households.A, reservation_set_id: booking.reservationSet,
    slot_id: base.slot, slot_offer_id: base.slotOffers.shared, offer_id: base.offers.shared,
    participant_count: 2,
  });
  const item = await insert(connection, 'service_items', {
    household_id: base.households.A, booking_id: booking.booking,
    service_id: base.services.A, slot_id: base.slot, offer_id: base.offers.shared, reservation_id: reservation,
    participant_count: 2, quantity: '2.0000', pricing_type_snapshot: 'PER_PERSON',
    duration_minutes: 180, starts_at: '2030-11-20 07:00:00', ends_at: '2030-11-20 10:00:00',
    service_name_snapshot: 'Trải nghiệm bắt cá', unit_price_vnd: '150000', line_total_vnd: '300000',
    offer_snapshot: { name: 'Bắt cá ghép', pricingType: 'PER_PERSON' }, resource_usage_snapshot: [],
    ...overrides,
  });
  return { item, reservation };
}
