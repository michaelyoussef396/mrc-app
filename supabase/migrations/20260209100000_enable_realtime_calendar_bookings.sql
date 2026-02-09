-- Enable realtime on calendar_bookings so technician dashboards get instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_bookings;
