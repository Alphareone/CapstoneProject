import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

import { usePropertyMap } from "@/hooks/useProperties";
import { flagShort, money } from "@/lib/format";
import { useFilterStore } from "@/store/filters";

const COLOR: Record<string, string> = {
  g: "#1A5C2E",
  a: "#7A4800",
  r: "#8B1A1A",
  p: "#777777",
};

// Centro de Mercer County / Trenton, New Jersey.
const NJ_CENTER: [number, number] = [40.26, -74.71];

export default function PropertyMap({ onOpen }: { onOpen: (id: string) => void }) {
  const flag = useFilterStore((s) => s.flag);
  const county_id = useFilterStore((s) => s.county_id);
  const auction_type = useFilterStore((s) => s.auction_type);
  const property_type = useFilterStore((s) => s.property_type);
  const min_roi = useFilterStore((s) => s.min_roi);
  const q = useFilterStore((s) => s.q);

  const { data } = usePropertyMap({
    flag,
    county_id,
    auction_type,
    property_type,
    min_roi,
    q,
  });
  const features = data ?? [];

  return (
    <div className="card-surface overflow-hidden" style={{ height: "70vh" }}>
      <MapContainer center={NJ_CENTER} zoom={10} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {features.map((f) => {
          const s = flagShort(f.flag);
          return (
            <CircleMarker
              key={f.id}
              center={[f.lat, f.lng]}
              radius={9}
              pathOptions={{
                color: COLOR[s],
                fillColor: COLOR[s],
                fillOpacity: 0.85,
                weight: 2,
                dashArray: f.provisional ? "4 3" : undefined,
              }}
              eventHandlers={{ click: () => onOpen(f.id) }}
            >
              <Popup>
                <div className="text-xs">
                  {f.address && <div className="font-bold">{f.address}</div>}
                  <div>{money(f.opening_price)}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}