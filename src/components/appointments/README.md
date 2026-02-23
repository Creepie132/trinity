# Appointment Calendar Component

High-fidelity calendar UI component with RTL support for Trinity CRM.

## Features

- ✅ **Week View Grid**: Time slots (Y-axis) × Days (X-axis)
- ✅ **RTL Support**: Automatic layout mirroring for Hebrew
- ✅ **Interactive Pop-out Effect**: Cards smoothly animate on hover (Framer Motion)
- ✅ **Color-Coded Appointments**: Different service types with pastel backgrounds
- ✅ **Mini Calendar**: Floating date picker with upcoming events
- ✅ **Navigation**: Today button, week navigation, month/year display
- ✅ **View Modes**: Week and Day views
- ✅ **Responsive**: Clean, professional white theme

## Components

### `AppointmentCalendar`
Main calendar component with grid layout, appointment cards, and header.

**Props:**
- `locale?: 'he' | 'ru' | 'en'` - Language/direction (default: 'en')

### `MiniCalendar`
Compact calendar widget with month view and upcoming events.

**Props:**
- `selectedDate: Date` - Currently selected date
- `onDateSelect: (date: Date) => void` - Date selection handler
- `locale?: 'he' | 'ru' | 'en'` - Language/direction (default: 'en')

## Usage

```tsx
import { AppointmentCalendar } from '@/components/appointments'

export default function AppointmentsPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <AppointmentCalendar locale="he" />
    </div>
  )
}
```

## Appointment Types

| Type | Color | Use Case |
|------|-------|----------|
| `consultation` | Blue | Initial surveys, consultations |
| `surgery` | Pink | Surgical procedures |
| `meeting` | Green | Staff meetings, nurse appointments |
| `checkup` | Orange | Follow-ups, dermatology checks |

## Styling

- Built with **Tailwind CSS**
- Uses 1px light-gray borders (`border-slate-100`)
- Rounded corners with soft shadows
- Left border accent line for each card type
- Hover effect: `scale(1.02)` + `shadow-2xl`

## Animations

Powered by **Framer Motion**:
- Smooth hover transitions
- Spring animation (`stiffness: 300, damping: 25`)
- Z-index elevation on hover
- Mini calendar slide-in effect

## RTL Logic

When `locale="he"`:
- `dir="rtl"` applied to root
- Layout automatically mirrors
- Navigation and controls reverse
- Text alignment adjusts

## Future Enhancements

- [ ] Connect to Supabase `visits` table
- [ ] Drag & drop appointment rescheduling
- [ ] Day view implementation
- [ ] Appointment creation modal
- [ ] Client search and filtering
- [ ] Export to calendar formats (iCal, Google)
- [ ] Recurring appointments support

## Dependencies

```json
{
  "framer-motion": "^11.x",
  "date-fns": "^4.x",
  "lucide-react": "^0.x"
}
```

---

**Created:** 2026-02-23  
**Version:** 1.0.0
