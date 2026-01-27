# Required Square OAuth Permissions

This document lists all Square OAuth permissions required by this application based on the Square API endpoints used in the codebase.

## Summary

The following permissions are required:

1. **APPOINTMENTS_READ** - Read bookings/appointments
2. **APPOINTMENTS_WRITE** - Create, update, and cancel bookings
3. **APPOINTMENTS_ALL_READ** - Read all bookings (seller-level access)
4. **APPOINTMENTS_ALL_WRITE** - Write all bookings (seller-level access)
5. **APPOINTMENTS_BUSINESS_SETTINGS_READ** - Read team member booking profiles
6. **CUSTOMERS_READ** - Read customer information
7. **CUSTOMERS_WRITE** - Create and update customers
8. **MERCHANT_PROFILE_READ** - Read location information
9. **ITEMS_READ** - Read catalog items/services
10. **EMPLOYEES_READ** - Read team member information

## Detailed API Endpoint Mapping

### Bookings API

| API Method | Endpoint Used | Required Permissions |
|------------|---------------|---------------------|
| `CreateBooking` | `bookings.create()` | **APPOINTMENTS_WRITE** + **APPOINTMENTS_ALL_WRITE** (seller-level) |
| `RetrieveBooking` | `bookings.get()` | **APPOINTMENTS_READ** + **APPOINTMENTS_ALL_READ** (seller-level) |
| `UpdateBooking` | `bookings.update()` | **APPOINTMENTS_WRITE** + **APPOINTMENTS_ALL_WRITE** (seller-level) |
| `CancelBooking` | `bookings.cancel()` | **APPOINTMENTS_WRITE** + **APPOINTMENTS_ALL_WRITE** (seller-level) |
| `ListBookings` | `bookings.list()` | **APPOINTMENTS_READ** + **APPOINTMENTS_ALL_READ** (seller-level) |
| `SearchAvailability` | `bookings.searchAvailability()` | **APPOINTMENTS_READ** + **APPOINTMENTS_ALL_READ** (seller-level) |
| `ListTeamMemberBookingProfiles` | `bookings.teamMemberProfiles.list()` | **APPOINTMENTS_BUSINESS_SETTINGS_READ** |
| `RetrieveTeamMemberBookingProfile` | `bookings.teamMemberProfiles.get()` | **APPOINTMENTS_BUSINESS_SETTINGS_READ** |

**Note:** Since this application manages bookings on behalf of merchants (seller-level), both buyer-level and seller-level permissions are required for booking operations.

### Customers API

| API Method | Endpoint Used | Required Permissions |
|------------|---------------|---------------------|
| `SearchCustomers` | `customers.search()` | **CUSTOMERS_READ** |
| `CreateCustomer` | `customers.create()` | **CUSTOMERS_WRITE** |
| `RetrieveCustomer` | `customers.get()` | **CUSTOMERS_READ** |

### Locations API

| API Method | Endpoint Used | Required Permissions |
|------------|---------------|---------------------|
| `ListLocations` | `locations.list()` | **MERCHANT_PROFILE_READ** |
| `RetrieveLocation` | `locations.get()` | **MERCHANT_PROFILE_READ** |

### Catalog API

| API Method | Endpoint Used | Required Permissions |
|------------|---------------|---------------------|
| `SearchCatalogObjects` | `catalog.search()` | **ITEMS_READ** |
| `RetrieveCatalogObject` | `catalog.object.get()` | **ITEMS_READ** |

### Team API

| API Method | Endpoint Used | Required Permissions |
|------------|---------------|---------------------|
| `RetrieveTeamMember` | `teamMembers.get()` | **EMPLOYEES_READ** |

## Permission Groups

### Core Booking Permissions (Required)
- `APPOINTMENTS_READ` - Read bookings
- `APPOINTMENTS_WRITE` - Create/update/cancel bookings
- `APPOINTMENTS_ALL_READ` - Read all bookings (seller-level)
- `APPOINTMENTS_ALL_WRITE` - Write all bookings (seller-level)
- `APPOINTMENTS_BUSINESS_SETTINGS_READ` - Read booking profiles

### Customer Management (Required)
- `CUSTOMERS_READ` - Read customer data
- `CUSTOMERS_WRITE` - Create customers

### Location & Merchant Info (Required)
- `MERCHANT_PROFILE_READ` - Read location information

### Service Catalog (Required)
- `ITEMS_READ` - Read catalog items/services

### Team Management (Required)
- `EMPLOYEES_READ` - Read team member information

## OAuth Scope String

When requesting OAuth authorization, include these scopes:

```
APPOINTMENTS_READ APPOINTMENTS_WRITE APPOINTMENTS_ALL_READ APPOINTMENTS_ALL_WRITE APPOINTMENTS_BUSINESS_SETTINGS_READ CUSTOMERS_READ CUSTOMERS_WRITE MERCHANT_PROFILE_READ ITEMS_READ EMPLOYEES_READ
```

## Implementation Notes

1. **Seller-Level vs Buyer-Level**: This application operates at the seller-level (managing bookings for merchants), so it requires both `APPOINTMENTS_READ`/`APPOINTMENTS_WRITE` and `APPOINTMENTS_ALL_READ`/`APPOINTMENTS_ALL_WRITE` permissions.

2. **Team Members**: The application uses `EMPLOYEES_READ` to retrieve team member information. Note that the Team API replaced the deprecated Employees API, but the permission name remains `EMPLOYEES_READ`.

3. **Catalog Access**: The application searches for catalog items with `product_type = APPOINTMENTS_SERVICE` to find bookable services, requiring `ITEMS_READ` permission.

4. **Location Access**: Location information is needed for business hours, timezone, and filtering bookings/availability, requiring `MERCHANT_PROFILE_READ` permission.

## References

- [Square OAuth Permissions Reference](https://developer.squareup.com/docs/oauth-api/square-permissions)
- Square API Documentation for each endpoint
