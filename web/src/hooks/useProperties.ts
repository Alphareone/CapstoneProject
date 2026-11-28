import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Facets, Page, PropertyDetail, PropertyListItem } from "@/types/api";

export interface PropertyQuery {
  flag: string[];
  county_id: string[];
  auction_type: string[];
  property_type: string[];
  min_roi: number | null;
  q: string;
  sort: string;
  page: number;
  page_size: number;
}

function toParams(f: PropertyQuery): URLSearchParams {
  const p = new URLSearchParams();
  f.flag.forEach((v) => p.append("flag", v));
  f.county_id.forEach((v) => p.append("county_id", v));
  f.auction_type.forEach((v) => p.append("auction_type", v));
  f.property_type.forEach((v) => p.append("property_type", v));
  if (f.min_roi != null) p.set("min_roi", String(f.min_roi));
  if (f.q) p.set("q", f.q);
  if (f.sort) p.set("sort", f.sort);
  p.set("page", String(f.page));
  p.set("page_size", String(f.page_size));
  return p;
}

// NOTA: el backend acepta un único county_id en el listado; enviamos el primero
// seleccionado. Para multi-county se usarían segmentos/facetas.
export function useProperties(f: PropertyQuery) {
  return useQuery({
    queryKey: ["properties", f],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Page<PropertyListItem>> => {
      const params = toParams(f);
      // El listado toma un solo county_id: usa el primero.
      params.delete("county_id");
      if (f.county_id[0]) params.set("county_id", f.county_id[0]);
      const { data } = await api.get(`/api/v1/properties?${params.toString()}`);
      return data;
    },
  });
}

export function useProperty(id: string | null) {
  return useQuery({
    queryKey: ["property", id],
    enabled: !!id,
    queryFn: async (): Promise<PropertyDetail> => {
      const { data } = await api.get(`/api/v1/properties/${id}`);
      return data;
    },
  });
}

export function useFacets(f: PropertyQuery) {
  return useQuery({
    queryKey: ["facets", f.flag, f.county_id, f.auction_type, f.property_type, f.min_roi, f.q],
    queryFn: async (): Promise<Facets> => {
      const params = toParams({ ...f, page: 1, page_size: 1 });
      params.delete("county_id");
      if (f.county_id[0]) params.set("county_id", f.county_id[0]);
      params.delete("sort");
      params.delete("page");
      params.delete("page_size");
      const { data } = await api.get(`/api/v1/properties/facets?${params.toString()}`);
      return data;
    },
  });
}

export interface MapFeature {
  id: string;
  address?: string;
  flag: string | null;
  provisional: boolean;
  opening_price: number | null;
  lat: number;
  lng: number;
}

export function usePropertyMap(f: Pick<PropertyQuery, "flag" | "county_id" | "auction_type" | "property_type" | "min_roi" | "q">) {
  return useQuery({
    queryKey: ["map", f.flag, f.county_id, f.auction_type, f.property_type, f.min_roi, f.q],
    queryFn: async (): Promise<MapFeature[]> => {
      // 1. Traer coordenadas base desde /map
      const mapParams = new URLSearchParams();
      f.flag.forEach((v) => mapParams.append("flag", v));
      if (f.county_id[0]) mapParams.set("county_id", f.county_id[0]);

      // 2. Traer propiedades filtradas con TODOS los filtros activos
      const listParams = toParams({
        ...f,
        sort: "",
        page: 1,
        page_size: 200,
      });
      listParams.delete("county_id");
      if (f.county_id[0]) listParams.set("county_id", f.county_id[0]);

      const [mapRes, listRes] = await Promise.all([
        api.get(`/api/v1/properties/map?${mapParams.toString()}`),
        api.get(`/api/v1/properties?${listParams.toString()}`),
      ]);

      const allowedIds = new Map<string, PropertyListItem>(
        (listRes.data?.items ?? []).map((item: PropertyListItem) => [item.id, item])
      );

      return (mapRes.data.features ?? [])
        .filter((ft: { properties: { id: string } }) => allowedIds.has(ft.properties.id))
        .map((ft: {
          geometry: { coordinates: [number, number] };
          properties: { id: string; flag: string | null; provisional?: boolean; opening_price: number | null };
        }) => {
          const item = allowedIds.get(ft.properties.id);
          return {
            id: ft.properties.id,
            address: item?.address,
            flag: ft.properties.flag,
            provisional: Boolean(ft.properties.provisional),
            opening_price: ft.properties.opening_price,
            lng: ft.geometry.coordinates[0],
            lat: ft.geometry.coordinates[1],
          };
        });
    },
  });
}