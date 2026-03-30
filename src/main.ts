import Map from "@arcgis/core/Map";
import type Collection from "@arcgis/core/core/Collection";
import type { ResourceHandle } from "@arcgis/core/core/Handles";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import CatalogLayer from "@arcgis/core/layers/CatalogLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import KnowledgeGraphLayer from "@arcgis/core/layers/KnowledgeGraphLayer";
import type Layer from "@arcgis/core/layers/Layer";
import {
  getCatalogLayerForLayer,
  isLayerFromCatalog,
} from "@arcgis/core/layers/catalog/catalogUtils";
import ActionButton from "@arcgis/core/support/actions/ActionButton";
import CatalogLayerView from "@arcgis/core/views/layers/CatalogLayerView";
import type ListItem from "@arcgis/core/widgets/LayerList/ListItem";
import "@arcgis/map-components/components/arcgis-layer-list";
import "@arcgis/map-components/components/arcgis-map";
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-label";
import "@esri/calcite-components/components/calcite-panel";
import "@esri/calcite-components/components/calcite-segmented-control";
import "@esri/calcite-components/components/calcite-segmented-control-item";
import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-switch";
import "./style.css";

let highlightHandle: ResourceHandle;

const filterModeHandles: ResourceHandle[] = [];
const layerListHandles: ResourceHandle[] = [];

const app = document.querySelector("#app");

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
  url: "https://sampleserver7.arcgisonline.com/server/rest/services/Hosted/BumbleBees/KnowledgeGraphServer",
});

const catalogLayer = new CatalogLayer({
  url: "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/Sanborn_maps_catalog/FeatureServer",
});
catalogLayer.dynamicGroupLayer.maximumVisibleSublayers = 20;

const viewElement = document.createElement("arcgis-map");
viewElement.itemId = "512944c00f8a4219a4bb70691089c9e9";
viewElement.center = [-105, 39];
viewElement.zoom = 7;
app?.appendChild(viewElement);

await viewElement.viewOnReady();
viewElement.map?.layers.addMany([...featureLayers, catalogLayer]);

const arcgisLayerList = document.createElement("arcgis-layer-list");
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
          icon: "information",
          id: "information",
          title: "Show information",
          type: "button",
        },
      ],
    ];
  },
  minFilterItems: 1,
  selectionMode: "single",
  visibleElements: {
    errors: true,
    filter: true,
    statusIndicators: true,
  },
};
arcgisLayerList.showCloseButton = true;
arcgisLayerList.showCollapseButton = true;
arcgisLayerList.showFilter = true;
arcgisLayerList.showHeading = true;
arcgisLayerList.slot = "top-right";
viewElement.appendChild(arcgisLayerList);

const optionsPanel = document.createElement("calcite-panel");
optionsPanel.heading = "Options";
optionsPanel.collapsible = true;
optionsPanel.slot = "top-left";

const visibilityAppearanceSwitchLabel = document.createElement("calcite-label");
visibilityAppearanceSwitchLabel.id = "visibility-appearance-switch-label";
visibilityAppearanceSwitchLabel.layout = "inline";
visibilityAppearanceSwitchLabel.textContent = "Checkboxes";

const visibilityAppearanceSwitch = document.createElement("calcite-switch");
visibilityAppearanceSwitch.addEventListener("calciteSwitchChange", (event) => {
  const { target } = event;
  target.checked
    ? (arcgisLayerList.visibilityAppearance = "checkbox")
    : (arcgisLayerList.visibilityAppearance = "default");
});

visibilityAppearanceSwitchLabel.appendChild(visibilityAppearanceSwitch);
optionsPanel.appendChild(visibilityAppearanceSwitchLabel);

const addKnowledgeGraphLayerButton = document.createElement("calcite-button");
addKnowledgeGraphLayerButton.textContent = "Add knowledge graph layer";
addKnowledgeGraphLayerButton.addEventListener("click", () => {
  if (viewElement.map) {
    viewElement.map.layers.add(knowledgeGraphLayer);
    addKnowledgeGraphLayerButton.disabled = true;
  }
});

optionsPanel.appendChild(addKnowledgeGraphLayerButton);

const filterPredicateSegmentedControl = document.createElement(
  "calcite-segmented-control",
);

const allSegmentedControlItem = document.createElement(
  "calcite-segmented-control-item",
);
allSegmentedControlItem.checked = true;
allSegmentedControlItem.textContent = "All layers";
allSegmentedControlItem.value = "all";
filterPredicateSegmentedControl.appendChild(allSegmentedControlItem);

const visibleSegmentedControlItem = document.createElement(
  "calcite-segmented-control-item",
);
visibleSegmentedControlItem.textContent = "Visible layers";
visibleSegmentedControlItem.value = "visible";
filterPredicateSegmentedControl.appendChild(visibleSegmentedControlItem);

const extentSegmentedControlItem = document.createElement(
  "calcite-segmented-control-item",
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
  },
);

optionsPanel.appendChild(filterPredicateSegmentedControl);

viewElement.appendChild(optionsPanel);

arcgisLayerList.addEventListener("arcgisReady", (event) => {
  const selectedItemsChangeHandle = event.target?.selectedItems.on(
    "change",
    (event: { removed: ListItem[]; added: ListItem[] }) => {
      const { removed, added } = event;
      removed.forEach((item: ListItem) => {
        const { layer } = item;
        if (layer instanceof FeatureLayer) {
          layer.effect = "none";
        }
      });
      added.forEach((item: ListItem) => {
        const { layer } = item;
        if (layer instanceof FeatureLayer) {
          layer.effect = "drop-shadow(2px, 2px, 3px) saturate(250%)";
        }
      });
    },
  );

  arcgisLayerList.addEventListener("arcgisTriggerAction", (event) => {
    const { id } = event.detail.action;
    const { layer } = event.detail.item;

    const addGroupLayer = (
      parent: Map | GroupLayer,
      layers: Collection<Layer>,
    ) => {
      const groupLayer = new GroupLayer({
        title: "New group layer",
      });
      const layerIndex = layers.findIndex((mapLayer) => layer === mapLayer);
      parent.add(groupLayer, layerIndex + 1);
      groupLayer.add(layer as Layer);
    };

    if (id === "add-group-layer" && layer) {
      if (layer.parent instanceof GroupLayer) {
        addGroupLayer(layer.parent, layer.parent.layers);
      } else if (layer.parent instanceof Map) {
        if (viewElement.map) {
          addGroupLayer(layer.parent, viewElement.map.layers);
        }
      }
    }

    if (id === "zoom-to") {
      const fullExtent = (layer as Layer).fullExtent;
      if (fullExtent) {
        viewElement.goTo(fullExtent);
      }
    }
  });

  if (selectedItemsChangeHandle) {
    layerListHandles.push(selectedItemsChangeHandle);
  }

  const catalogLayerListActionHandle = reactiveUtils.on(
    () => event.target?.catalogLayerList,
    "trigger-action",
    async (event: any) => {
      if (event.action.id === "add-layer") {
        arcgisLayerList?.openedLayers.pop();
        try {
          await addLayerFromDynamicGroup(event.item.layer);
          alert(`Added ${event.item.layer.title} to the map`);
        } catch (error) {
          console.error("Failed to add layer from dynamic group", error);
          alert(`Unable to add ${event.item.layer.title} to the map`);
        }
      }

      if (event.action.id === "zoom-to") {
        const fullExtent = (event.item.layer as Layer).fullExtent;
        if (fullExtent) {
          viewElement.goTo(fullExtent);
        }
      }
    },
  );
  layerListHandles.push(catalogLayerListActionHandle);

  const catalogListHighlightWatchHandle = reactiveUtils.watch(
    () => event.target?.catalogLayerList,
    () => {
      highlightHandle && highlightHandle.remove();
    },
  );
  layerListHandles.push(catalogListHighlightWatchHandle);

  const catalogSelectionWatchHandle = reactiveUtils.watch(
    () => event.target?.catalogLayerList?.selectedItems.at(0)?.layer as Layer,
    (layer: Layer) => {
      layer && handleLayerSelection(layer);
    },
  );
  layerListHandles.push(catalogSelectionWatchHandle);

  const selectedItemsWatchHandle = reactiveUtils.watch(
    () => event.target?.selectedItems.at(0)?.layer as Layer,
    (layer: Layer) => layer && handleLayerSelection(layer),
  );
  layerListHandles.push(selectedItemsWatchHandle);

  const tableListActionHandle = reactiveUtils.on(
    () => event.target?.tableList,
    "trigger-action",
    (event: any) => {
      if (event.action.id === "information") {
        alert(`${event.item.layer.title}`);
      }
    },
  );
  layerListHandles.push(tableListActionHandle);

  const tableSelectionWatchHandle = reactiveUtils.watch(
    () => event.target?.tableList?.selectedItems.at(0)?.layer as Layer,
    (layer: Layer) => {
      layer && handleLayerSelection(layer);
    },
  );
  layerListHandles.push(tableSelectionWatchHandle);
});

window.addEventListener("beforeunload", () => {
  clearFilterModeHandles();
  clearLayerListHandles();
  highlightHandle?.remove();
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
  const layerFromFootprint =
    await parentCatalogLayer.createLayerFromFootprint(footprint);
  viewElement.map?.layers.add(layerFromFootprint);
}

function clearFilterModeHandles() {
  for (const handle of filterModeHandles) {
    handle.remove();
  }
  filterModeHandles.length = 0;
}

function clearLayerListHandles() {
  for (const handle of layerListHandles) {
    handle.remove();
  }
  layerListHandles.length = 0;
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

    const layerView = (await viewElement.view.whenLayerView(
      parentCatalogLayer,
    )) as CatalogLayerView;
    await reactiveUtils.whenOnce(() => !layerView.updating);

    highlightHandle?.remove();
    if (!footprint || !layerView.footprintLayerView) {
      return;
    }
    highlightHandle = layerView.footprintLayerView.highlight(footprint);
  }
}

async function listItemCreatedFunction(event: { item: ListItem }) {
  const { item } = event;
  const { layer } = item;

  if (layer) {
    try {
      await layer.load();
    } catch {
      console.log(`load failed for ${layer.title}`);
    }

    item.actionsSections = [[]];

    if (
      layer.type !== "group" &&
      layer.type !== "knowledge-graph" &&
      layer.type !== "catalog" &&
      layer.type !== "catalog-dynamic-group"
    ) {
      item.panel = {
        content: "legend",
      };
    }

    if (layer.type !== "catalog-dynamic-group") {
      item.actionsSections.getItemAt(0)?.push(
        new ActionButton({
          title: "Zoom to",
          icon: "zoom-to-object",
          id: "zoom-to",
        }),
      );
    }

    if (
      !isLayerFromCatalog(layer as Layer) &&
      layer.type !== "catalog-dynamic-group" &&
      layer.type !== "catalog-footprint" &&
      layer.type !== "knowledge-graph-sublayer"
    ) {
      item.actionsSections.getItemAt(0)?.push(
        new ActionButton({
          title: "Create group layer",
          icon: "folder-new",
          id: "add-group-layer",
        }),
      );
    }

    if (isLayerFromCatalog(layer as Layer)) {
      item.actionsSections.getItemAt(0)?.push(
        new ActionButton({
          title: "Add layer to map",
          icon: "add-layer",
          id: "add-layer",
        }),
      );
    }
  }
}

function showAll() {
  clearFilterModeHandles();
  arcgisLayerList.filterPredicate = null;
}

function showAtCurrentViewExtent() {
  clearFilterModeHandles();
  filterModeHandles.push(
    reactiveUtils.watch(
      () =>
        (viewElement.map?.allLayers.filter((layer): layer is Layer => {
          if (!layer.fullExtent) {
            return false;
          }
          return viewElement.view.extent.intersects(layer.fullExtent);
        }) ?? []) as Layer[],
      (layers: Layer[]) => {
        arcgisLayerList.filterPredicate = (item) => {
          if (!item || !item.layer) {
            return false;
          }
          const layer = item.layer as Layer;
          return layers.includes(layer);
        };
      },
      { initial: true },
    ),
  );
}

function showVisible() {
  clearFilterModeHandles();
  filterModeHandles.push(
    reactiveUtils.watch(
      () =>
        (viewElement.map?.allLayers.filter(
          (layer): layer is Layer => layer.visible,
        ) ?? []) as Layer[],
      (layers: Layer[]) => {
        arcgisLayerList.filterPredicate = (item) => {
          if (!item || !item.layer) {
            return false;
          }
          const layer = item.layer as Layer;
          return layers.includes(layer);
        };
      },
      { initial: true },
    ),
  );
}
