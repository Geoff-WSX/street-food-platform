declare global {
  interface Window {
    AMap?: {
      Map: any;
      Marker: any;
      InfoWindow: any;
      Geocoder: any;
      ToolBar: any;
      Scale: any;
      ControlBar: any;
      LatLngBounds: any;
    };
  }
}

export {};
