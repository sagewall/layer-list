import Map from "@arcgis/core/Map";
import type Collection from "@arcgis/core/core/Collection";
import type { ResourceHandle } from "@arcgis/core/core/Handles";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
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
import "@arcgis/map-components/components/arcgis-layer-list-new";
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

let isUsingLayerListNew = true;
let activeLayerListElement = createLayerListElement(isUsingLayerListNew);

let highlightHandle: ResourceHandle;
const filterModeHandles: ResourceHandle[] = [];
const layerListHandles: ResourceHandle[] = [];

const app = document.querySelector("#app")!;
const html = document.querySelector("html")!;

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

const viewElement = document.createElement("arcgis-map");
viewElement.itemId = "512944c00f8a4219a4bb70691089c9e9";
viewElement.center = [-105, 39];
viewElement.zoom = 7;
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
  isUsingLayerListNew = target.checked;
  try {
    await replaceLayerList(isUsingLayerListNew);
  } finally {
    target.disabled = false;
  }
});

const arcgisLayerListNewTextSpan = document.createElement("span");
arcgisLayerListNewTextSpan.textContent = "arcgis-layer-list-new";

layerListTypeSwitchLabel.appendChild(arcgisLayerListTextSpan);
layerListTypeSwitchLabel.appendChild(layerListTypeSwitch);
layerListTypeSwitchLabel.appendChild(arcgisLayerListNewTextSpan);

optionsPanel.appendChild(layerListTypeSwitchLabel);

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

async function setupLayerList(
  layerListElement: HTMLArcgisLayerListElement | HTMLArcgisLayerListNewElement,
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
  layerListElement.showFilter = true;
  layerListElement.showHeading = true;
  layerListElement.slot = "top-right";
  layerListElement.visibilityAppearance = visibilityAppearanceSwitch.checked
    ? "checkbox"
    : "default";

  setFilterPredicate(getSelectedFilterMode());

  if (!isUsingLayerListNew) {
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

  if (isUsingLayerListNew) {
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

  if (!isUsingLayerListNew) {
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

  if (isUsingLayerListNew) {
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

function createLayerListElement(useLayerListNew: boolean) {
  const tagName = useLayerListNew
    ? "arcgis-layer-list-new"
    : "arcgis-layer-list";
  const layerListElement = document.createElement(tagName) as
    | HTMLArcgisLayerListElement
    | HTMLArcgisLayerListNewElement;

  return layerListElement;
}

function clearLayerListHandles() {
  for (const handle of layerListHandles) {
    handle.remove();
  }
  layerListHandles.length = 0;
}

function getSelectedFilterMode(): FilterMode {
  const value = filterPredicateSegmentedControl.value;
  if (value === "all" || value === "visible" || value === "extent") {
    return value;
  }

  console.warn(`Unexpected filter mode "${value}". Falling back to "all".`);
  return "all";
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

function itemMatchesCurrentFilterText(item: ListItem): boolean {
  const filterText = (
    (
      activeLayerListElement as
        | HTMLArcgisLayerListElement
        | HTMLArcgisLayerListNewElement
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

async function replaceLayerList(useLayerListNew: boolean) {
  clearFilterModeHandles();
  clearLayerListHandles();
  highlightHandle?.remove();

  const previousLayerList = activeLayerListElement;
  activeLayerListElement = createLayerListElement(useLayerListNew);

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
