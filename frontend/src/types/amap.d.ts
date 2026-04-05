declare global {
  interface Window {
    AMap?: {
      Map: new (container: string | HTMLElement, options: Record<string, unknown>) => unknown;
      Marker: new (options: Record<string, unknown>) => unknown;
      InfoWindow: new (options: Record<string, unknown>) => unknown;
      Geocoder: new (options?: Record<string, unknown>) => unknown;
      ToolBar: new (options?: Record<string, unknown>) => unknown;
      Scale: new (options?: Record<string, unknown>) => unknown;
      ControlBar: new (options?: Record<string, unknown>) => unknown;
      LatLngBounds: new (southWest: [number, number], northEast: [number, number]) => unknown;
    };
  }
}

export {};
