import Map from "@arcgis/core/Map.js";
import config from "@arcgis/core/config.js";
import type Collection from "@arcgis/core/core/Collection.js";
import type { ResourceHandle } from "@arcgis/core/core/Handles.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import CatalogLayer from "@arcgis/core/layers/CatalogLayer.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import GroupLayer from "@arcgis/core/layers/GroupLayer.js";
import KnowledgeGraphLayer from "@arcgis/core/layers/KnowledgeGraphLayer.js";
import type Layer from "@arcgis/core/layers/Layer.js";
import {
  getCatalogLayerForLayer,
  isLayerFromCatalog,
} from "@arcgis/core/layers/catalog/catalogUtils.js";
import ActionButton from "@arcgis/core/support/actions/ActionButton.js";
import CatalogLayerView from "@arcgis/core/views/layers/CatalogLayerView.js";
import type ListItem from "@arcgis/core/widgets/LayerList/ListItem.js";
import "@arcgis/map-components/components/arcgis-layer-list";
import "@arcgis/map-components/components/arcgis-layer-list-next";
import "@arcgis/map-components/components/arcgis-map";
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-label";
import "@esri/calcite-components/components/calcite-panel";
import "@esri/calcite-components/components/calcite-segmented-control";
import "@esri/calcite-components/components/calcite-segmented-control-item";
import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-switch";
import "./style.css";

type FilterMode = "all" | "extent" | "visible";

const app = document.querySelector("#app")!;
const defaultWebMapItemId = "512944c00f8a4219a4bb70691089c9e9";
const defaultPortal = "maps.arcgis.com";
const html = document.querySelector("html")!;
const filterModeHandles: ResourceHandle[] = [];
const layerListHandles: ResourceHandle[] = [];

let isUsingLayerListNext = true;
let activeLayerListElement = createLayerListElement(isUsingLayerListNext);
let highlightHandle: ResourceHandle;

const knowledgeGraphLayer = new KnowledgeGraphLayer({
  url: "https://sampleserver7.arcgisonline.com/server/rest/services/Hosted/BumbleBees/KnowledgeGraphServer",
});

const catalogLayer = new CatalogLayer({
  url: "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/Sanborn_maps_catalog/FeatureServer",
});

const portal = getPortalFromUrl(defaultPortal);
const normalizedPortal = normalizePortal(portal);
config.portalUrl = normalizedPortal;
syncPortalQueryParam(portal);

const webMapItemId = getWebmapFromUrl(defaultWebMapItemId);
syncWebmapQueryParam(webMapItemId);

const viewElement = document.createElement("arcgis-map");
viewElement.itemId = webMapItemId;
app?.appendChild(viewElement);

await viewElement.viewOnReady();

viewElement.appendChild(activeLayerListElement);

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
    ? (activeLayerListElement.visibilityAppearance = "checkbox")
    : (activeLayerListElement.visibilityAppearance = "default");
});

visibilityAppearanceSwitchLabel.appendChild(visibilityAppearanceSwitch);
optionsPanel.appendChild(visibilityAppearanceSwitchLabel);

const layerListTypeSwitchLabel = document.createElement("calcite-label");
layerListTypeSwitchLabel.id = "layer-list-type-switch-label";
layerListTypeSwitchLabel.layout = "inline";
const arcgisLayerListTextSpan = document.createElement("span");
arcgisLayerListTextSpan.textContent = "arcgis-layer-list";

const layerListTypeSwitch = document.createElement("calcite-switch");
layerListTypeSwitch.disabled = true;
layerListTypeSwitch.checked = true;
layerListTypeSwitch.addEventListener("calciteSwitchChange", async (event) => {
  const { target } = event;
  target.disabled = true;
  isUsingLayerListNext = target.checked;
  try {
    await replaceLayerList(isUsingLayerListNext);
  } finally {
    target.disabled = false;
  }
});

const arcgisLayerListNextTextSpan = document.createElement("span");
arcgisLayerListNextTextSpan.textContent = "arcgis-layer-list-next";

layerListTypeSwitchLabel.appendChild(arcgisLayerListTextSpan);
layerListTypeSwitchLabel.appendChild(layerListTypeSwitch);
layerListTypeSwitchLabel.appendChild(arcgisLayerListNextTextSpan);

optionsPanel.appendChild(layerListTypeSwitchLabel);

const addCatalogLayerButton = document.createElement("calcite-button");
addCatalogLayerButton.textContent = "Add catalog layer";
addCatalogLayerButton.addEventListener("click", () => {
  if (viewElement.map) {
    viewElement.map.layers.add(catalogLayer);
    addCatalogLayerButton.disabled = true;
  }
});

optionsPanel.appendChild(addCatalogLayerButton);

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
  () => setFilterPredicate(getSelectedFilterMode()),
);

optionsPanel.appendChild(filterPredicateSegmentedControl);

const languageSegmentedControl = document.createElement(
  "calcite-segmented-control",
);

const englishSegmentedControlItem = document.createElement(
  "calcite-segmented-control-item",
);
englishSegmentedControlItem.checked = true;
englishSegmentedControlItem.textContent = "English";
englishSegmentedControlItem.value = "en";
languageSegmentedControl.appendChild(englishSegmentedControlItem);

const spanishSegmentedControlItem = document.createElement(
  "calcite-segmented-control-item",
);
spanishSegmentedControlItem.textContent = "Spanish";
spanishSegmentedControlItem.value = "es";
languageSegmentedControl.appendChild(spanishSegmentedControlItem);

const arabicSegmentedControlItem = document.createElement(
  "calcite-segmented-control-item",
);
arabicSegmentedControlItem.textContent = "Arabic";
arabicSegmentedControlItem.value = "ar";
languageSegmentedControl.appendChild(arabicSegmentedControlItem);

languageSegmentedControl.addEventListener(
  "calciteSegmentedControlChange",
  () => {
    const selectedLanguage = languageSegmentedControl.value;
    if (selectedLanguage === "en") {
      html.lang = "en";
      html.dir = "ltr";
    } else if (selectedLanguage === "es") {
      html.lang = "es";
      html.dir = "ltr";
    } else if (selectedLanguage === "ar") {
      html.lang = "ar";
      html.dir = "rtl";
    }
  },
);

optionsPanel.appendChild(languageSegmentedControl);

viewElement.appendChild(optionsPanel);

try {
  await setupLayerList(activeLayerListElement);
} finally {
  layerListTypeSwitch.disabled = false;
}

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

function createLayerListElement(useLayerListNext: boolean) {
  const tagName = useLayerListNext
    ? "arcgis-layer-list-next"
    : "arcgis-layer-list";
  const layerListElement = document.createElement(tagName) as
    | HTMLArcgisLayerListElement
    | HTMLArcgisLayerListNextElement;

  return layerListElement;
}

function getPortalFromUrl(defaultPortal: string): string {
  const searchParams = new URL(window.location.href).searchParams;
  const portalFromQuery = searchParams.get("portal")?.trim();
  return portalFromQuery || defaultPortal;
}

function getSelectedFilterMode(): FilterMode {
  const value = filterPredicateSegmentedControl.value;
  if (value === "all" || value === "visible" || value === "extent") {
    return value;
  }

  console.warn(`Unexpected filter mode "${value}". Falling back to "all".`);
  return "all";
}

function getWebmapFromUrl(defaultWebmap: string): string {
  const searchParams = new URL(window.location.href).searchParams;
  const webmapFromQuery = searchParams.get("webmap")?.trim();
  return webmapFromQuery || defaultWebmap;
}

async function handleLayerSelection(layer: Layer) {
  console.log("layer.title:", layer.title);
  console.log("layer.type:", layer.type);
  console.log("layer.persistenceEnabled:", layer.persistenceEnabled);
  console.log("isLayerFromCatalog:", isLayerFromCatalog(layer));
  console.log("layer.loaded:", layer.loaded);

  const layerView = await viewElement.whenLayerView(layer);
  console.log("layerView.updating", layerView.updating);

  if ("loadStatus" in layer) {
    console.log("layer.loadStatus:", layer.loadStatus);
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

function itemMatchesCurrentFilterText(item: ListItem): boolean {
  const filterText = (
    (
      activeLayerListElement as
        | HTMLArcgisLayerListElement
        | HTMLArcgisLayerListNextElement
    ).filterText ?? ""
  )
    .trim()
    .toLowerCase();
  if (!filterText) {
    return true;
  }

  const itemTitle = ((item.title ?? item.layer?.title ?? "") as string)
    .trim()
    .toLowerCase();
  return itemTitle.includes(filterText);
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
      layer.type !== "knowledge-graph-sublayer" &&
      layer.type !== "sublayer" &&
      layer.type !== "subtype-group" &&
      layer.type !== "subtype-sublayer"
    ) {
      item.actionsSections.getItemAt(0)?.push(
        new ActionButton({
          title: "Create group layer",
          icon: "folder-new",
          id: "add-group-layer",
        }),
      );
    }

    if (
      isLayerFromCatalog(layer as Layer) &&
      getCatalogLayerForLayer(layer as Layer)
    ) {
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

function normalizePortal(portal: string): string {
  if (!portal) {
    return "https://maps.arcgis.com";
  }

  return /^https?:\/\//i.test(portal) ? portal : `https://${portal}`;
}

async function replaceLayerList(useLayerListNext: boolean) {
  clearFilterModeHandles();
  clearLayerListHandles();
  highlightHandle?.remove();

  const previousLayerList = activeLayerListElement;
  activeLayerListElement = createLayerListElement(useLayerListNext);

  previousLayerList.remove();
  viewElement.appendChild(activeLayerListElement);
  await setupLayerList(activeLayerListElement);
}

function setFilterPredicate(mode: FilterMode) {
  switch (mode) {
    case "extent":
      showAtCurrentViewExtent();
      return;
    case "visible":
      showVisible();
      return;
    default:
      showAll();
  }
}

async function setupLayerList(
  layerListElement: HTMLArcgisLayerListElement | HTMLArcgisLayerListNextElement,
) {
  await layerListElement.componentOnReady();

  layerListElement.dragEnabled = true;
  layerListElement.filterPlaceholder = "Filter layers";
  layerListElement.knowledgeGraphOptions = {
    filterPlaceholder: "Filter tables",
    listItemCreatedFunction: (event: any) => {
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
  layerListElement.listItemCreatedFunction = listItemCreatedFunction;
  layerListElement.selectionMode = "single";
  layerListElement.showCloseButton = true;
  layerListElement.showCollapseButton = true;
  layerListElement.showErrors = true;
  layerListElement.showFilter = true;
  layerListElement.showHeading = true;
  layerListElement.showTemporaryLayerIndicators = true;
  layerListElement.slot = "top-right";
  layerListElement.visibilityAppearance = visibilityAppearanceSwitch.checked
    ? "checkbox"
    : "default";

  setFilterPredicate(getSelectedFilterMode());

  if (!isUsingLayerListNext) {
    const catalogLayerListActionHandle = reactiveUtils.on(
      () => layerListElement.catalogLayerList,
      "trigger-action",
      async (event: any) => {
        if (event.action.id === "add-layer") {
          try {
            const parentCatalogLayer = getCatalogLayerForLayer(
              event.item.layer,
            );
            if (!parentCatalogLayer) {
              return;
            }
            await addLayerFromDynamicGroup(event.item.layer);
            alert(`Added ${event.item.layer.title} to the map`);
          } catch (error) {
            console.error("Failed to add layer from dynamic group", error);
            alert(`Unable to add ${event.item.layer.title} to the map`);
          }
          layerListElement?.openedLayers?.pop();
        }
      },
    );
    layerListHandles.push(catalogLayerListActionHandle);
  }

  if (isUsingLayerListNext) {
    const catalogLayerListActionHandle = reactiveUtils.on(
      () => layerListElement.catalogLayerList,
      "arcgisTriggerAction",
      async (event: any) => {
        const { action, item } = event.detail;
        if (action.id === "add-layer") {
          try {
            const parentCatalogLayer = getCatalogLayerForLayer(item.layer);
            if (!parentCatalogLayer) {
              return;
            }
            await addLayerFromDynamicGroup(item.layer);
            alert(`Added ${item.layer.title} to the map`);
          } catch (error) {
            console.error("Failed to add layer from dynamic group", error);
            alert(`Unable to add ${item.layer.title} to the map`);
          }
          layerListElement?.openedLayers?.pop();
        }
      },
    );
    layerListHandles.push(catalogLayerListActionHandle);
  }

  const catalogListHighlightWatchHandle = reactiveUtils.watch(
    () => layerListElement.catalogLayerList,
    () => {
      highlightHandle && highlightHandle.remove();
    },
  );
  layerListHandles.push(catalogListHighlightWatchHandle);

  const catalogSelectionWatchHandle = reactiveUtils.watch(
    () =>
      layerListElement.catalogLayerList?.selectedItems?.at(0)?.layer as Layer,
    (layer: Layer) => {
      layer && handleLayerSelection(layer);
    },
  );
  layerListHandles.push(catalogSelectionWatchHandle);

  const selectedItemsChangeHandle = layerListElement.selectedItems?.on(
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
  layerListHandles.push(selectedItemsChangeHandle);

  const selectedItemsWatchHandle = reactiveUtils.watch(
    () => layerListElement.selectedItems?.at(0)?.layer as Layer,
    (layer: Layer) => layer && handleLayerSelection(layer),
  );
  layerListHandles.push(selectedItemsWatchHandle);

  if (!isUsingLayerListNext) {
    const tableListActionHandle = reactiveUtils.on(
      () => layerListElement.tableList,
      "trigger-action",
      (event: any) => {
        if (event.action.id === "information") {
          alert(`${event.item.layer.title}`);
        }
      },
    );
    layerListHandles.push(tableListActionHandle);
  }

  if (isUsingLayerListNext) {
    const tableListActionHandle = reactiveUtils.on(
      () => layerListElement.tableList,
      "arcgisTriggerAction",
      (event: any) => {
        const { action, item } = event.detail;
        if (action.id === "information") {
          alert(`${item.layer?.title}`);
        }
      },
    );
    layerListHandles.push(tableListActionHandle);
  }

  const tableSelectionWatchHandle = reactiveUtils.watch(
    () => layerListElement.tableList?.selectedItems?.at(0)?.layer as Layer,
    (layer: Layer) => {
      layer && handleLayerSelection(layer);
    },
  );
  layerListHandles.push(tableSelectionWatchHandle);

  layerListElement.addEventListener("arcgisTriggerAction", (event: any) => {
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
}

function showAll() {
  clearFilterModeHandles();
  activeLayerListElement.filterPredicate = undefined;
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
        activeLayerListElement.filterPredicate = (item: ListItem) => {
          if (!item || !item.layer) {
            return false;
          }
          const layer = item.layer as Layer;
          return layers.includes(layer) && itemMatchesCurrentFilterText(item);
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
        activeLayerListElement.filterPredicate = (item: ListItem) => {
          if (!item || !item.layer) {
            return false;
          }
          const layer = item.layer as Layer;
          return layers.includes(layer) && itemMatchesCurrentFilterText(item);
        };
      },
      { initial: true },
    ),
  );
}

function syncPortalQueryParam(portal: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("portal", portal);
  window.history.replaceState({}, "", url);
}

function syncWebmapQueryParam(webmap: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("webmap", webmap);
  window.history.replaceState({}, "", url);
}
