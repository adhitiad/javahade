const fs = require('fs');
const file = 'src/components/booking/booking-view.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove MOCK_CREATORS definition
content = content.replace(/const MOCK_CREATORS: CreatorProfile\[\] = \[[\s\S]*?\] as CreatorProfile,\n\];/g, '');
// Remove MOCK_RATES
content = content.replace(/const MOCK_RATES: Record<string, HostBookingRate\[\]> = \{[\s\S]*?\n\};\n/g, '');
// Remove MOCK_ROOMS
content = content.replace(/const MOCK_ROOMS: Room\[\] = \[[\s\S]*?\n\];\n/g, '');
// Remove MOCK_MY_BOOKINGS
content = content.replace(/const MOCK_MY_BOOKINGS: HostBooking\[\] = \[[\s\S]*?\n\];\n/g, '');

// Import store and api
if (!content.includes("import { useBookingStore }")) {
  content = content.replace(/import type \{[\s\S]*?\} from '@\/types';/, 
    match => `import { useBookingStore } from '@/stores/booking-store';\nimport { api } from '@/lib/api';\n${match}`
  );
}

// Inside BookingView
content = content.replace(/export default function BookingView[^{]*{/, 
  match => `${match}\n  const { myBookings, fetchMyBookings, slots, fetchSlots } = useBookingStore();\n  const [creators, setCreators] = React.useState<CreatorProfile[]>([]);\n  React.useEffect(() => {\n    fetchMyBookings();\n    api.get('/creators/').then((res: any) => setCreators(res.results || res)).catch(console.error);\n    fetchSlots();\n  }, [fetchMyBookings, fetchSlots]);\n`
);

// Replace usages
content = content.replace(/MOCK_CREATORS/g, 'creators');
content = content.replace(/MOCK_MY_BOOKINGS/g, 'myBookings');
content = content.replace(/MOCK_RATES/g, '{}');
content = content.replace(/MOCK_ROOMS/g, '[]');

fs.writeFileSync(file, content, 'utf8');
