import "./style.css";
import Map from "@arcgis/core/Map";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import MapView from "@arcgis/core/views/MapView";
import LayerList from "@arcgis/core/widgets/LayerList";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";

defineCustomElements(window, {
  resourcesUrl: "https://js.arcgis.com/calcite-components/2.1.0/assets",
});

const layerUrls = [
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/NDGD_SmokeForecast_v1/FeatureServer/0",
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/MODIS_Thermal_v1/FeatureServer/0",
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/USA_Wildfires_v1/FeatureServer/1",
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/USA_Wildfires_v1/FeatureServer/0",
];

const layers = layerUrls.map((url) => {
  return new FeatureLayer({
    url,
  });
});

const map = new Map({
  basemap: "topo-vector",
  layers,
});

const view = new MapView({
  map,
  center: [-105, 39],
  container: "viewDiv",
  zoom: 7,
});

const layerList = new LayerList({
  dragEnabled: true,
  filterPlaceholder: "Filter layers",
  listItemCreatedFunction: (event) => {
    const { item } = event;
    item.panel = {
      content: "legend",
      flowEnabled: true,
    };
  },
  selectionMode: "multiple",
  view,
  visibilityAppearance: "checkbox",
  visibleElements: {
    filter: true,
    heading: true,
    closeButton: true,
    collapseButton: true,
  },
});

view.ui.add("switch-panel", "top-right");
view.ui.add(layerList, "top-right");

const visibilityAppearanceSwitch = document.querySelector(
  "#visibility-appearance-switch"
) as HTMLCalciteSwitchElement;

visibilityAppearanceSwitch.addEventListener("calciteSwitchChange", (event) => {
  const { target } = event;
  target.checked
    ? (layerList.visibilityAppearance = "checkbox")
    : (layerList.visibilityAppearance = "default");
});
