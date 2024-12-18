import Map from "@arcgis/core/Map";
import type Collection from "@arcgis/core/core/Collection";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import KnowledgeGraphLayer from "@arcgis/core/layers/KnowledgeGraphLayer";
import type Layer from "@arcgis/core/layers/Layer";
import MapView from "@arcgis/core/views/MapView";
import LayerList from "@arcgis/core/widgets/LayerList";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import "./style.css";

defineCustomElements(window, {
  resourcesUrl: "https://js.arcgis.com/calcite-components/2.7.1/assets",
});

const featureLayerUrls = [
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/NDGD_SmokeForecast_v1/FeatureServer/0",
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/MODIS_Thermal_v1/FeatureServer/0",
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/USA_Wildfires_v1/FeatureServer/1",
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/USA_Wildfires_v1/FeatureServer/0",
];

const featureLayers = featureLayerUrls.map((url) => {
  return new FeatureLayer({
    url,
  });
});

/**
 * Credentials to sign in to the knowledge graph service:
 * https://sampleserver7.arcgisonline.com/server/rest/services/Hosted/BumbleBees/KnowledgeGraphServer
 * https://sampleserver7.arcgisonline.com/server/rest/services/Hosted/PhoneCalls/KnowledgeGraphServer
 *
 * username: viewer01
 * password: I68VGU^nMurF
 */
const knowledgeGraphLayer = new KnowledgeGraphLayer({
  title: "Phone calls",
  url: `https://sampleserver7.arcgisonline.com/server/rest/services/Hosted/PhoneCalls/KnowledgeGraphServer`,
});

const map = new Map({
  basemap: "topo-vector",
  layers: [...featureLayers, knowledgeGraphLayer],
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
  listItemCreatedFunction: async (event) => {
    const { item } = event;
    const { layer } = item;

    await layer.load();

    item.panel = {
      content: "legend",
    };

    if (layer.type === "knowledge-graph-sublayer") {
      item.actionsSections = [
        [
          {
            title: "Open attribute table",
            icon: "table",
            id: "attribute-table",
          },
          {
            icon: "information",
            id: "information",
            title: "Show information",
          },
        ],
      ];
    }

    if (layer.type === "feature") {
      item.actionsSections = [
        [
          {
            title: "Create group layer",
            icon: "folder-new",
            id: "add-group-layer",
          },
        ],
      ];
    }
  },
  selectionMode: "multiple",
  knowledgeGraphOptions: {
    filterPlaceholder: "Filter tables",

    listItemCreatedFunction: (event) => {
      const { item } = event;
      item.actionsSections = [
        [
          {
            icon: "table",
            id: "open-table",
            title: "Show table",
          },
          {
            icon: "information",
            id: "information",
            title: "Show information",
          },
        ],
      ];
    },
    minFilterItems: 1,
    visibleElements: {
      errors: true,
      filter: true,
      statusIndicators: true,
    },
  },
  view,
  visibleElements: {
    filter: true,
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
    groupLayer.add(layer as Layer);
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
