import Map from "@arcgis/core/Map";
import type Collection from "@arcgis/core/core/Collection";
import type Handles from "@arcgis/core/core/Handles";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import CatalogLayer from "@arcgis/core/layers/CatalogLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import KnowledgeGraphLayer from "@arcgis/core/layers/KnowledgeGraphLayer";
import type Layer from "@arcgis/core/layers/Layer";
import {
  getCatalogLayerForLayer,
  isLayerFromCatalog
} from "@arcgis/core/layers/catalog/catalogUtils";
import CatalogLayerView from "@arcgis/core/views/layers/CatalogLayerView";
import "@arcgis/map-components/components/arcgis-layer-list";
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-placement";
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-label";
import "@esri/calcite-components/components/calcite-panel";
import "@esri/calcite-components/components/calcite-segmented-control";
import "@esri/calcite-components/components/calcite-segmented-control-item";
import "@esri/calcite-components/components/calcite-switch";
import "./style.css";

let currentViewExtentLayersHandle: __esri.WatchHandle;
let highlightHandle: Handles;
let visibleLayerHandle: __esri.WatchHandle;

const app = document.querySelector("#app");

const featureLayerUrls = [
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/NDGD_SmokeForecast_v1/FeatureServer/0",
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/MODIS_Thermal_v1/FeatureServer/0",
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/USA_Wildfires_v1/FeatureServer/1",
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/USA_Wildfires_v1/FeatureServer/0"
];

const featureLayers = featureLayerUrls.map((url) => {
  return new FeatureLayer({
    url
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
  url: `https://sampleserver7.arcgisonline.com/server/rest/services/Hosted/PhoneCalls/KnowledgeGraphServer`
});

const catalogLayer = new CatalogLayer({
  url: "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/Sanborn_maps_catalog/FeatureServer"
});
catalogLayer.dynamicGroupLayer.maximumVisibleSublayers = 20;

const arcgisMap = document.createElement("arcgis-map");
arcgisMap.basemap = "topo-vector";
arcgisMap.center = [-105, 39];
arcgisMap.zoom = 7;
app?.appendChild(arcgisMap);

if (arcgisMap.ready) {
  handleMapReady();
} else {
  arcgisMap.addEventListener("arcgisViewReadyChange", handleMapReady, {
    once: true
  });
}

const arcgisLayerList = document.createElement("arcgis-layer-list");
arcgisLayerList.catalogOptions = {
  listItemCreatedFunction,
  selectionMode: "single"
};
arcgisLayerList.dragEnabled = true;
arcgisLayerList.filterPlaceholder = "Filter layers";
arcgisLayerList.listItemCreatedFunction = listItemCreatedFunction;
arcgisLayerList.selectionMode = "single";
arcgisLayerList.knowledgeGraphOptions = {
  filterPlaceholder: "Filter tables",

  listItemCreatedFunction: (event) => {
    const { item } = event;
    item.actionsSections = [
      [
        {
          icon: "table",
          id: "open-table",
          title: "Show table"
        },
        {
          icon: "information",
          id: "information",
          title: "Show information"
        }
      ]
    ];
  },
  minFilterItems: 1,
  visibleElements: {
    errors: true,
    filter: true,
    statusIndicators: true
  }
};
arcgisLayerList.showCloseButton = true;
arcgisLayerList.showCollapseButton = true;
arcgisLayerList.showFilter = true;
arcgisLayerList.showHeading = true;
arcgisLayerList.position = "top-right";
arcgisMap.appendChild(arcgisLayerList);

const addLayersPlacement = document.createElement("arcgis-placement");
addLayersPlacement.position = "top-left";
const addLayersPanel = document.createElement("calcite-panel");
addLayersPanel.id = "add-layers-panel";
addLayersPanel.heading = "Add layers";

const addKnowledgeGraphLayerButton = document.createElement("calcite-button");
addKnowledgeGraphLayerButton.id = "add-catalog-layer-button";
addKnowledgeGraphLayerButton.textContent = "Add knowledge graph layer";
addKnowledgeGraphLayerButton.addEventListener("click", () => {
  arcgisMap.map.layers.add(knowledgeGraphLayer);
  addKnowledgeGraphLayerButton.disabled = true;
});

addLayersPanel.appendChild(addKnowledgeGraphLayerButton);
addLayersPlacement.appendChild(addLayersPanel);
arcgisMap.appendChild(addLayersPlacement);

const visibilityAppearanceSwitchPlacement =
  document.createElement("arcgis-placement");
visibilityAppearanceSwitchPlacement.position = "bottom-left";
const visibilityAppearanceSwitchPanel = document.createElement("calcite-panel");
visibilityAppearanceSwitchPanel.id = "switch-panel";
visibilityAppearanceSwitchPanel.heading = "Appearance";
const visibilityAppearanceSwitchLabel = document.createElement("calcite-label");
visibilityAppearanceSwitchLabel.textContent = "checkboxes";

const visibilityAppearanceSwitch = document.createElement("calcite-switch");
visibilityAppearanceSwitch.id = "visibility-appearance-switch";
visibilityAppearanceSwitch.addEventListener("calciteSwitchChange", (event) => {
  const { target } = event;
  target.checked
    ? (arcgisLayerList.visibilityAppearance = "checkbox")
    : (arcgisLayerList.visibilityAppearance = "default");
});

visibilityAppearanceSwitchLabel.appendChild(visibilityAppearanceSwitch);
visibilityAppearanceSwitchPanel.appendChild(visibilityAppearanceSwitchLabel);
visibilityAppearanceSwitchPlacement.appendChild(
  visibilityAppearanceSwitchPanel
);
arcgisMap.appendChild(visibilityAppearanceSwitchPlacement);

const filterPredicateSegmentedControlPlacement =
  document.createElement("arcgis-placement");
filterPredicateSegmentedControlPlacement.position = "top-left";

const filterPredicateSegmentedControlPanel =
  document.createElement("calcite-panel");
filterPredicateSegmentedControlPanel.heading = "filterPredicate";

const filterPredicateSegmentedControl = document.createElement(
  "calcite-segmented-control"
);

const allSegmentedControlItem = document.createElement(
  "calcite-segmented-control-item"
);
allSegmentedControlItem.checked = true;
allSegmentedControlItem.textContent = "All layers";
allSegmentedControlItem.value = "all";
filterPredicateSegmentedControl.appendChild(allSegmentedControlItem);

const visibleSegmentedControlItem = document.createElement(
  "calcite-segmented-control-item"
);
visibleSegmentedControlItem.textContent = "Visible layers";
visibleSegmentedControlItem.value = "visible";
filterPredicateSegmentedControl.appendChild(visibleSegmentedControlItem);

const extentSegmentedControlItem = document.createElement(
  "calcite-segmented-control-item"
);
extentSegmentedControlItem.textContent = "Layers in view extent";
extentSegmentedControlItem.value = "extent";
filterPredicateSegmentedControl.appendChild(extentSegmentedControlItem);

filterPredicateSegmentedControl.addEventListener(
  "calciteSegmentedControlChange",
  () => {
    switch (filterPredicateSegmentedControl.value) {
      case "all":
        showAll();
        break;
      case "visible":
        showVisible();
        break;
      case "extent":
        showAtCurrentViewExtent();
        break;
      default:
        showAll();
    }
  }
);

filterPredicateSegmentedControlPanel.appendChild(
  filterPredicateSegmentedControl
);
filterPredicateSegmentedControlPlacement.appendChild(
  filterPredicateSegmentedControlPanel
);
arcgisMap.appendChild(filterPredicateSegmentedControlPlacement);

arcgisLayerList.addEventListener("arcgisTriggerAction", (event) => {
  const { id } = event.detail.action;
  const { layer } = event.detail.item;

  const addGroupLayer = (
    parent: Map | GroupLayer,
    layers: Collection<Layer>
  ) => {
    const groupLayer = new GroupLayer({
      title: "New group layer"
    });
    const layerIndex = layers.findIndex((mapLayer) => layer === mapLayer);
    parent.add(groupLayer, layerIndex + 1);
    groupLayer.add(layer as Layer);
  };

  if (id === "add-group-layer" && layer) {
    if (layer.parent instanceof GroupLayer) {
      addGroupLayer(layer.parent, layer.parent.layers);
    } else if (layer.parent instanceof Map) {
      addGroupLayer(layer.parent, arcgisMap.map.layers);
    }
  }

  if (id === "zoom-to") {
    arcgisMap.goTo((layer as Layer).fullExtent);
  }
});

arcgisLayerList.addEventListener("arcgisReady", () => {
  arcgisLayerList.selectedItems.on("change", (event) => {
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

  reactiveUtils.on(
    () => arcgisLayerList.catalogLayerList,
    "trigger-action",
    (event: any) => {
      if (event.action.id === "add-layer") {
        arcgisLayerList.openedLayers.pop();
        addLayerFromDynamicGroup(event.item.layer);
        alert(`Added ${event.item.layer.title} to the map`);
      }
    }
  );

  reactiveUtils.watch(
    () => arcgisLayerList.catalogLayerList,
    () => {
      highlightHandle && highlightHandle.remove();
    }
  );

  reactiveUtils.watch(
    () => arcgisLayerList.selectedItems.at(0)?.layer as Layer,
    (layer: Layer) => layer && handleLayerSelection(layer)
  );

  reactiveUtils.watch(
    () => arcgisLayerList.catalogLayerList?.selectedItems.at(0)?.layer as Layer,
    (layer: Layer) => {
      layer && handleLayerSelection(layer);
    }
  );
});

async function addLayerFromDynamicGroup(layer: FeatureLayer) {
  const parentCatalogLayer = getCatalogLayerForLayer(layer);
  if (!parentCatalogLayer) {
    return;
  }
  const footprint = parentCatalogLayer.createFootprintFromLayer(layer);
  if (!footprint) {
    return;
  }
  const layerFromFootprint = await parentCatalogLayer.createLayerFromFootprint(
    footprint
  );
  arcgisMap.addLayer(layerFromFootprint);
}

async function handleLayerSelection(layer: Layer) {
  console.log(layer.title, layer.type, layer.persistenceEnabled);

  if (layer instanceof FeatureLayer) {
    console.log("Layer title:", layer.title);
  }

  if (isLayerFromCatalog(layer)) {
    const parentCatalogLayer = getCatalogLayerForLayer(layer);
    if (!parentCatalogLayer) {
      return;
    }
    const footprint = parentCatalogLayer.createFootprintFromLayer(layer);

    const layerView = (await arcgisMap.view.whenLayerView(
      parentCatalogLayer
    )) as CatalogLayerView;
    await reactiveUtils.whenOnce(() => !layerView.updating);

    highlightHandle?.remove();
    if (!footprint || !layerView.footprintLayerView) {
      return;
    }
    highlightHandle = layerView.footprintLayerView.highlight(
      footprint
    ) as Handles;
  }
}

function handleMapReady() {
  arcgisMap.addLayers([...featureLayers, catalogLayer]);
  // arcgisMap.addLayers([...featureLayers, catalogLayer, knowledgeGraphLayer]);
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
    content: "legend"
  };

  if (layer.type === "knowledge-graph-sublayer") {
    item.actionsSections = [
      [
        {
          title: "Open attribute table",
          icon: "table",
          id: "attribute-table"
        },
        {
          icon: "information",
          id: "information",
          title: "Show information"
        }
      ]
    ];
    return;
  }

  if (isLayerFromCatalog(layer)) {
    item.actionsSections = [
      [
        {
          title: "Add layer to map",
          icon: "add-layer",
          id: "add-layer"
        }
      ]
    ];
    return;
  }
  if (!isLayerFromCatalog(layer)) {
    item.actionsSections = [
      [
        {
          title: "Zoom to",
          icon: "zoom-to-object",
          id: "zoom-to"
        }
      ],
      [
        {
          title: "Create group layer",
          icon: "folder-new",
          id: "add-group-layer"
        }
      ]
    ];
    return;
  }
}

function showAll() {
  currentViewExtentLayersHandle?.remove();
  visibleLayerHandle?.remove();
  arcgisLayerList.filterPredicate = null;
}

function showAtCurrentViewExtent() {
  currentViewExtentLayersHandle = reactiveUtils.watch(
    () =>
      arcgisMap.map.allLayers.filter((layer) => {
        if (!layer.fullExtent) {
          return false;
        }
        return arcgisMap.view.extent.intersects(layer.fullExtent);
      }),
    (layers) => {
      arcgisLayerList.filterPredicate = (item) => {
        if (!item || !item.layer) {
          return false;
        }
        const layer = item.layer as Layer;
        return layers.includes(layer);
      };
    },
    { initial: true }
  );
}

function showVisible() {
  visibleLayerHandle = reactiveUtils.watch(
    () => arcgisMap.map.allLayers.filter((layer) => layer.visible),
    (layers) => {
      arcgisLayerList.filterPredicate = (item) => {
        if (!item || !item.layer) {
          return false;
        }
        const layer = item.layer as Layer;
        return layers.includes(layer);
      };
    },
    { initial: true }
  );
}
