import Map from "@arcgis/core/Map";
import type Collection from "@arcgis/core/core/Collection";
import type Handles from "@arcgis/core/core/Handles";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import CatalogLayer from "@arcgis/core/layers/CatalogLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import type Layer from "@arcgis/core/layers/Layer";
import {
  getCatalogLayerForLayer,
  isLayerFromCatalog,
} from "@arcgis/core/layers/catalog/catalogUtils";
import MapView from "@arcgis/core/views/MapView";
import CatalogLayerView from "@arcgis/core/views/layers/CatalogLayerView";
import LayerList from "@arcgis/core/widgets/LayerList";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import "./style.css";

defineCustomElements(window, {
  resourcesUrl:
    "https://cdn.jsdelivr.net/npm/@esri/calcite-components@2.13.2/dist/calcite/assets",
});

let highlightHandle: Handles;

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
// const knowledgeGraphLayer = new KnowledgeGraphLayer({
//   title: "Phone calls",
//   url: `https://sampleserver7.arcgisonline.com/server/rest/services/Hosted/PhoneCalls/KnowledgeGraphServer`,
// });

const catalogLayer = new CatalogLayer({
  url: "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/Sanborn_maps_catalog/FeatureServer",
});
catalogLayer.dynamicGroupLayer.maximumVisibleSublayers = 20;

const map = new Map({
  basemap: "topo-vector",
  // layers: [...featureLayers, knowledgeGraphLayer],
  layers: [...featureLayers, catalogLayer],
});

const view = new MapView({
  map,
  center: [-105, 39],
  container: "viewDiv",
  zoom: 7,
});

const layerList = new LayerList({
  catalogOptions: {
    listItemCreatedFunction,
    selectionMode: "single",
  },
  dragEnabled: true,
  filterPlaceholder: "Filter layers",
  listItemCreatedFunction,
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

  if (id === "zoom-to") {
    view.goTo((layer as Layer).fullExtent);
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

reactiveUtils.on(
  () => layerList.catalogLayerList,
  "trigger-action",
  (event: any) => {
    if (event.action.id === "add-layer") {
      layerList.openedLayers.pop();
      addLayerFromDynamicGroup(event.item.layer);
      alert(`Added ${event.item.layer.title} to the map`);
    }
  }
);

reactiveUtils.watch(
  () => layerList.catalogLayerList,
  () => {
    highlightHandle && highlightHandle.remove();
  }
);

reactiveUtils.watch(
  () => layerList.selectedItems.at(0)?.layer as Layer,
  (layer: Layer) => layer && handleLayerSelection(layer)
);

reactiveUtils.watch(
  () => layerList.catalogLayerList?.selectedItems.at(0)?.layer as Layer,
  (layer: Layer) => {
    layer && handleLayerSelection(layer);
  }
);

async function addLayerFromDynamicGroup(layer: FeatureLayer) {
  const parentCatalogLayer = getCatalogLayerForLayer(layer);
  const footprint = parentCatalogLayer.createFootprintFromLayer(layer);
  const layerFromFootprint = await parentCatalogLayer.createLayerFromFootprint(
    footprint
  );
  map.add(layerFromFootprint);
}

async function handleLayerSelection(layer: Layer) {
  console.log(layer.title, layer.type, layer.persistenceEnabled);

  if (layer instanceof FeatureLayer) {
    console.log("publishingInfo.status", layer.publishingInfo?.status);
  }

  if (isLayerFromCatalog(layer)) {
    const parentCatalogLayer = getCatalogLayerForLayer(layer);
    const footprint = parentCatalogLayer.createFootprintFromLayer(layer);

    const layerView = (await view.whenLayerView(
      parentCatalogLayer
    )) as CatalogLayerView;
    await reactiveUtils.whenOnce(() => !layerView.updating);

    highlightHandle?.remove();
    highlightHandle = layerView.footprintLayerView.highlight(
      footprint
    ) as Handles;
  }
}

async function listItemCreatedFunction(event: any) {
  const { item } = event;
  const { layer } = item;

  try {
    layer && (await layer.load());
  } catch {
    console.log(`load failed for ${layer.title}`);
  }

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

  if (isLayerFromCatalog(layer)) {
    item.actionsSections = [
      [
        {
          title: "Add layer to map",
          icon: "add-layer",
          id: "add-layer",
        },
      ],
    ];
  }
  if (layer.type === "feature" && !isLayerFromCatalog(layer)) {
    item.actionsSections = [
      [
        {
          title: "Zoom to",
          icon: "zoom-to-object",
          id: "zoom-to",
        },
      ],
      [
        {
          title: "Create group layer",
          icon: "folder-new",
          id: "add-group-layer",
        },
      ],
    ];
  }
}
