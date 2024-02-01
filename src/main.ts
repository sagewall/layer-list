import Map from "@arcgis/core/Map";
import type Collection from "@arcgis/core/core/Collection";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import type Layer from "@arcgis/core/layers/Layer";
import MapView from "@arcgis/core/views/MapView";
import LayerList from "@arcgis/core/widgets/LayerList";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import "./style.css";

defineCustomElements(window, {
  resourcesUrl: "https://js.arcgis.com/calcite-components/2.2.0/assets",
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
});

layers.forEach((layer, index) => {
  setTimeout(() => {
    map.add(layer);
  }, index * 3000);
});

const view = new MapView({
  map,
  center: [-105, 39],
  container: "viewDiv",
  zoom: 7,
});

const layerList = new LayerList({
  filterPlaceholder: "Filter layers",
  listItemCreatedFunction: (event) => {
    const { item } = event;
    item.panel = {
      content: "legend",
      flowEnabled: true,
    };

    item.actionsSections = [
      [
        {
          title: "Create group layer",
          icon: "folder-new",
          id: "add-group-layer",
        },
      ],
    ];
  },
  selectionMode: "multiple",
  view,
  visibleElements: {
    heading: true,
    closeButton: true,
    collapseButton: true,
  },
});

layerList.on("trigger-action", (event) => {
  const { id } = event.action;
  const { layer } = event.item;

  const addGroupLayer = (
    parent: Map | GroupLayer,
    layers: Collection<Layer>
  ) => {
    const groupLayer = new GroupLayer({
      title: "New group layer",
    });
    const layerIndex = layers.findIndex((mapLayer) => layer === mapLayer);
    parent.add(groupLayer, layerIndex + 1);
    groupLayer.add(layer);
  };

  if (id === "add-group-layer") {
    if (layer.parent instanceof GroupLayer) {
      addGroupLayer(layer.parent, layer.parent.layers);
    } else if (layer.parent instanceof Map) {
      addGroupLayer(layer.parent, map.layers);
    }
  }
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

view.when(() => {
  reactiveUtils.watch(
    () => view.map.layers.length,
    (length) => {
      layerList.dragEnabled = length > 1;
      layerList.visibleElements.filter = length > 3;
    }
  );

  layerList.selectedItems.on("change", (event) => {
    const { removed, added } = event;
    removed.forEach((item) => {
      const { layer } = item;
      if (layer instanceof FeatureLayer) {
        layer.effect = "none";
      }
    });
    added.forEach((item) => {
      const { layer } = item;
      if (layer instanceof FeatureLayer) {
        layer.effect = "drop-shadow(2px, 2px, 3px) saturate(250%)";
      }
    });
  });
});
