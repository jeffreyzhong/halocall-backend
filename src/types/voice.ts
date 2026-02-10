/**
 * Type definitions for Voice Agent endpoints
 * 
 * These endpoints accept human-readable names instead of Square IDs,
 * enabling natural language interaction from voice agents.
 */

// ============================================================================
// Request Types (Name-Based)
// ============================================================================

/** POST /voice/services - List all services */
export interface VoiceServicesArgs {
  // No parameters required
}

/** POST /voice/staff - List staff members */
export interface VoiceStaffArgs {
  /** Optional: filter by service name */
  service_name?: string;
  /** Optional: filter by location name */
  location_name?: string;
}

/** POST /voice/locations - List all locations */
export interface VoiceLocationsArgs {
  // No parameters required
}

/** POST /voice/availability - Search available times */
export interface VoiceAvailabilityArgs {
  /** Service name (e.g., "Swedish massage", "60 minute massage") */
  service_name: string;
  /** Optional: staff member name (e.g., "Sarah", "anyone") */
  staff_name?: string;
  /** Agent's phone number (used to resolve the location from our database) */
  agent_phone: string;
  /** When to look for appointments (e.g., "tomorrow", "next Tuesday", "Thursday afternoon") */
  day_and_time: string;
}

/** POST /voice/book - Create a booking */
export interface VoiceBookArgs {
  /** Service name */
  service_name: string;
  /** Specific day and time (e.g., "tomorrow at 2pm", "Thursday at 10:30am") */
  day_and_time: string;
  /** Staff member name, or "anyone" if no preference */
  staff_name: string;
  /** Agent's phone number (used to resolve the location from our database) */
  agent_phone: string;
  /** Caller's phone number (used to look up the customer in Square) */
  caller_phone: string;
  /** Optional: notes for the appointment */
  notes?: string;
}

/** POST /voice/customer - Lookup customer by phone */
export interface VoiceCustomerLookupArgs {
  /** Phone number in any format */
  phone: string;
}

/** POST /voice/customer/create - Create new customer */
export interface VoiceCustomerCreateArgs {
  /** First name */
  first_name: string;
  /** Optional: last name */
  last_name?: string;
  /** Caller's phone number */
  caller_phone: string;
}

/** POST /voice/appointments - Get customer's appointments */
export interface VoiceAppointmentsArgs {
  /** Caller's phone number to look up customer */
  caller_phone: string;
}

/** POST /voice/reschedule - Reschedule an appointment */
export interface VoiceRescheduleArgs {
  /** Booking ID from the appointments list */
  booking_id: string;
  /** Booking version from the appointments list (required by Square for optimistic concurrency) */
  booking_version: number;
  /** New day and time (e.g., "Friday at 3pm", "next Monday at 10am") */
  new_day_and_time: string;
  /** Agent's phone number (used to resolve the location/timezone from our database) */
  agent_phone: string;
}

/** POST /voice/cancel - Cancel an appointment */
export interface VoiceCancelArgs {
  /** Booking ID from the appointments list */
  booking_id: string;
  /** Booking version from the appointments list (required by Square for optimistic concurrency) */
  booking_version: number;
}

// ============================================================================
// Response Types (Voice-Optimized)
// ============================================================================

/** Service info formatted for voice */
export interface VoiceServiceInfo {
  /** Display name (e.g., "Swedish Massage (60 minutes)") */
  name: string;
  /** Duration (e.g., "1 hour") */
  duration?: string;
  /** Price (e.g., "$120") */
  price?: string;
  /** Description if available */
  description?: string;
}

/** Staff info formatted for voice */
export interface VoiceStaffInfo {
  /** Staff member name */
  name: string;
}

/** Location info formatted for voice */
export interface VoiceLocationInfo {
  /** Location name */
  name: string;
  /** Address */
  address?: string;
  /** Business hours (formatted for speech) */
  hours?: string;
  /** Phone number */
  phone?: string;
}

/** A single time slot with available staff */
export interface VoiceAvailabilitySlot {
  /** Human-readable time (e.g., "9:00 AM") */
  time: string;
  /** Staff members available at this time */
  staff: string[];
}

/** Availability formatted for voice */
export interface VoiceAvailabilityResponse {
  /** All staff members who appear in the results */
  all_staff: string[];
  /** Available slots grouped by date, each with staff names */
  availability: Record<string, VoiceAvailabilitySlot[]>;
  /** Service being searched */
  service_name: string;
  /** Location name */
  location_name: string;
  /** Total unique time slots found */
  total_slots: number;
  /** Number of slots included in this response */
  slots_shown: number;
  /** Summary for voice agent to speak */
  summary: string;
}

/** Booking confirmation formatted for voice */
export interface VoiceBookingConfirmation {
  /** Confirmation/booking ID */
  confirmation_id: string;
  /** Human-readable appointment time */
  appointment_time: string;
  /** Service name */
  service_name: string;
  /** Location name */
  location_name: string;
  /** Staff name if assigned */
  staff_name?: string;
  /** Duration */
  duration?: string;
  /** Summary sentence for TTS */
  summary: string;
}

/** Customer lookup result */
export interface VoiceCustomerResult {
  /** Whether customer was found */
  found: boolean;
  /** Customer name if found */
  name?: string;
  /** Customer ID for booking */
  customer_id?: string;
  /** Message for voice agent */
  message: string;
}

/** Appointment list result */
export interface VoiceAppointmentInfo {
  /** Booking ID */
  booking_id: string;
  /** Human-readable time */
  appointment_time: string;
  /** Service name */
  service_name?: string;
  /** Location name */
  location_name?: string;
  /** Staff name */
  staff_name?: string;
  /** Status (confirmed, cancelled, etc.) */
  status: string;
  /** Version for updates */
  version: number;
}

/** Appointments list response */
export interface VoiceAppointmentsResponse {
  /** Customer name */
  customer_name: string;
  /** Number of upcoming appointments */
  upcoming_count: number;
  /** Upcoming appointments */
  upcoming: VoiceAppointmentInfo[];
  /** Summary for voice */
  summary: string;
}

/** Reschedule/cancel result */
export interface VoiceModifyResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** New appointment details (for reschedule) */
  new_time?: string;
  /** Message for voice agent */
  message: string;
}
