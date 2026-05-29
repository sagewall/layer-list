const Map = await $arcgis.import("@arcgis/core/Map.js");
const config = await $arcgis.import("@arcgis/core/config.js");
const reactiveUtils = await $arcgis.import("@arcgis/core/core/reactiveUtils.js");
const CatalogLayer = await $arcgis.import("@arcgis/core/layers/CatalogLayer.js");
const FeatureLayer = await $arcgis.import("@arcgis/core/layers/FeatureLayer.js");
const GroupLayer = await $arcgis.import("@arcgis/core/layers/GroupLayer.js");
const KnowledgeGraphLayer = await $arcgis.import("@arcgis/core/layers/KnowledgeGraphLayer.js");
const { getCatalogLayerForLayer, isLayerFromCatalog } = await $arcgis.import("@arcgis/core/layers/catalog/catalogUtils.js");
const ActionButton = await $arcgis.import("@arcgis/core/support/actions/ActionButton.js");
const CatalogLayerView = await $arcgis.import("@arcgis/core/views/layers/CatalogLayerView.js");

// Web components and styles are expected to be loaded via CDN in the host HTML.

const app = document.querySelector("#app");
const defaultWebMapItemId = "237b9584339446a0b56317b5962a4971";
const defaultPortal = "maps.arcgis.com";
const html = document.querySelector("html");
const filterModeHandles = [];
const layerListHandles = [];
let isUsingLayerListNext = true;
let activeLayerListElement = createLayerListElement(isUsingLayerListNext);
let highlightHandle;
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
    }
    finally {
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
const filterPredicateSegmentedControl = document.createElement("calcite-segmented-control");
const allSegmentedControlItem = document.createElement("calcite-segmented-control-item");
allSegmentedControlItem.checked = true;
allSegmentedControlItem.textContent = "All layers";
allSegmentedControlItem.value = "all";
filterPredicateSegmentedControl.appendChild(allSegmentedControlItem);
const visibleSegmentedControlItem = document.createElement("calcite-segmented-control-item");
visibleSegmentedControlItem.textContent = "Visible layers";
visibleSegmentedControlItem.value = "visible";
filterPredicateSegmentedControl.appendChild(visibleSegmentedControlItem);
const extentSegmentedControlItem = document.createElement("calcite-segmented-control-item");
extentSegmentedControlItem.textContent = "Layers in view extent";
extentSegmentedControlItem.value = "extent";
filterPredicateSegmentedControl.appendChild(extentSegmentedControlItem);
filterPredicateSegmentedControl.addEventListener("calciteSegmentedControlChange", () => setFilterPredicate(getSelectedFilterMode()));
optionsPanel.appendChild(filterPredicateSegmentedControl);
const languageSegmentedControl = document.createElement("calcite-segmented-control");
const englishSegmentedControlItem = document.createElement("calcite-segmented-control-item");
englishSegmentedControlItem.checked = true;
englishSegmentedControlItem.textContent = "English";
englishSegmentedControlItem.value = "en";
languageSegmentedControl.appendChild(englishSegmentedControlItem);
const spanishSegmentedControlItem = document.createElement("calcite-segmented-control-item");
spanishSegmentedControlItem.textContent = "Spanish";
spanishSegmentedControlItem.value = "es";
languageSegmentedControl.appendChild(spanishSegmentedControlItem);
const arabicSegmentedControlItem = document.createElement("calcite-segmented-control-item");
arabicSegmentedControlItem.textContent = "Arabic";
arabicSegmentedControlItem.value = "ar";
languageSegmentedControl.appendChild(arabicSegmentedControlItem);
languageSegmentedControl.addEventListener("calciteSegmentedControlChange", () => {
    const selectedLanguage = languageSegmentedControl.value;
    if (selectedLanguage === "en") {
        html.lang = "en";
        html.dir = "ltr";
    }
    else if (selectedLanguage === "es") {
        html.lang = "es";
        html.dir = "ltr";
    }
    else if (selectedLanguage === "ar") {
        html.lang = "ar";
        html.dir = "rtl";
    }
});
optionsPanel.appendChild(languageSegmentedControl);
viewElement.appendChild(optionsPanel);
try {
    await setupLayerList(activeLayerListElement);
}
finally {
    layerListTypeSwitch.disabled = false;
}
window.addEventListener("beforeunload", () => {
    clearFilterModeHandles();
    clearLayerListHandles();
    highlightHandle?.remove();
});
async function addLayerFromDynamicGroup(layer) {
    const parentCatalogLayer = getCatalogLayerForLayer(layer);
    if (!parentCatalogLayer) {
        return;
    }
    const footprint = parentCatalogLayer.createFootprintFromLayer(layer);
    if (!footprint) {
        return;
    }
    const layerFromFootprint = await parentCatalogLayer.createLayerFromFootprint(footprint);
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
function createLayerListElement(useLayerListNext) {
    const tagName = useLayerListNext
        ? "arcgis-layer-list-next"
        : "arcgis-layer-list";
    const layerListElement = document.createElement(tagName);
    return layerListElement;
}
function getPortalFromUrl(defaultPortal) {
    const searchParams = new URL(window.location.href).searchParams;
    const portalFromQuery = searchParams.get("portal")?.trim();
    return portalFromQuery || defaultPortal;
}
function getSelectedFilterMode() {
    const value = filterPredicateSegmentedControl.value;
    if (value === "all" || value === "visible" || value === "extent") {
        return value;
    }
    console.warn(`Unexpected filter mode "${value}". Falling back to "all".`);
    return "all";
}
function getWebmapFromUrl(defaultWebmap) {
    const searchParams = new URL(window.location.href).searchParams;
    const webmapFromQuery = searchParams.get("webmap")?.trim();
    return webmapFromQuery || defaultWebmap;
}
async function handleLayerSelection(layer) {
    console.log("layer.title:", layer.title);
    console.log("layer.type:", layer.type);
    console.log("layer.persistenceEnabled:", layer.persistenceEnabled);
    console.log("isLayerFromCatalog:", isLayerFromCatalog(layer));
    console.log("layer.loaded:", layer.loaded);
    if ("loadStatus" in layer) {
        console.log("layer.loadStatus:", layer.loadStatus);
    }
    if (isLayerFromCatalog(layer)) {
        const parentCatalogLayer = getCatalogLayerForLayer(layer);
        if (!parentCatalogLayer) {
            return;
        }
        const footprint = parentCatalogLayer.createFootprintFromLayer(layer);
        const layerView = (await viewElement.view.whenLayerView(parentCatalogLayer));
        await reactiveUtils.whenOnce(() => !layerView.updating);
        highlightHandle?.remove();
        if (!footprint || !layerView.footprintLayerView) {
            return;
        }
        highlightHandle = layerView.footprintLayerView.highlight(footprint);
    }
}
function itemMatchesCurrentFilterText(item) {
    const filterText = (activeLayerListElement.filterText ?? "")
        .trim()
        .toLowerCase();
    if (!filterText) {
        return true;
    }
    const itemTitle = (item.title ?? item.layer?.title ?? "")
        .trim()
        .toLowerCase();
    return itemTitle.includes(filterText);
}
async function listItemCreatedFunction(event) {
    const { item } = event;
    const { layer } = item;
    if (layer) {
        try {
            await layer.load();
        }
        catch {
            console.log(`load failed for ${layer.title}`);
        }
        item.actionsSections = [[]];
        if (layer.type !== "group" &&
            layer.type !== "knowledge-graph" &&
            layer.type !== "catalog" &&
            layer.type !== "catalog-dynamic-group") {
            item.panel = {
                content: "legend",
            };
        }
        if (layer.type !== "catalog-dynamic-group") {
            item.actionsSections.getItemAt(0)?.push(new ActionButton({
                title: "Zoom to",
                icon: "zoom-to-object",
                id: "zoom-to",
            }));
        }
        if (!isLayerFromCatalog(layer) &&
            layer.type !== "catalog-dynamic-group" &&
            layer.type !== "catalog-footprint" &&
            layer.type !== "knowledge-graph-sublayer" &&
            layer.type !== "sublayer" &&
            layer.type !== "subtype-group" &&
            layer.type !== "subtype-sublayer") {
            item.actionsSections.getItemAt(0)?.push(new ActionButton({
                title: "Create group layer",
                icon: "folder-new",
                id: "add-group-layer",
            }));
        }
        if (isLayerFromCatalog(layer) &&
            getCatalogLayerForLayer(layer)) {
            item.actionsSections.getItemAt(0)?.push(new ActionButton({
                title: "Add layer to map",
                icon: "add-layer",
                id: "add-layer",
            }));
        }
    }
}
function normalizePortal(portal) {
    if (!portal) {
        return "https://maps.arcgis.com";
    }
    return /^https?:\/\//i.test(portal) ? portal : `https://${portal}`;
}
async function replaceLayerList(useLayerListNext) {
    clearFilterModeHandles();
    clearLayerListHandles();
    highlightHandle?.remove();
    const previousLayerList = activeLayerListElement;
    activeLayerListElement = createLayerListElement(useLayerListNext);
    previousLayerList.remove();
    viewElement.appendChild(activeLayerListElement);
    await setupLayerList(activeLayerListElement);
}
function setFilterPredicate(mode) {
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
async function setupLayerList(layerListElement) {
    await layerListElement.componentOnReady();
    layerListElement.dragEnabled = true;
    layerListElement.filterPlaceholder = "Filter layers";
    layerListElement.knowledgeGraphOptions = {
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
    layerListElement.listItemCreatedFunction = listItemCreatedFunction;
    layerListElement.selectionMode = "single";
    layerListElement.showCloseButton = true;
    layerListElement.showCollapseButton = true;
    layerListElement.showErrors = true;
    layerListElement.showFilter = true;
    layerListElement.showHeading = true;
    layerListElement.slot = "top-right";
    layerListElement.visibilityAppearance = visibilityAppearanceSwitch.checked
        ? "checkbox"
        : "default";
    setFilterPredicate(getSelectedFilterMode());
    if (!isUsingLayerListNext) {
        const catalogLayerListActionHandle = reactiveUtils.on(() => layerListElement.catalogLayerList, "trigger-action", async (event) => {
            if (event.action.id === "add-layer") {
                try {
                    const parentCatalogLayer = getCatalogLayerForLayer(event.item.layer);
                    if (!parentCatalogLayer) {
                        return;
                    }
                    await addLayerFromDynamicGroup(event.item.layer);
                    alert(`Added ${event.item.layer.title} to the map`);
                }
                catch (error) {
                    console.error("Failed to add layer from dynamic group", error);
                    alert(`Unable to add ${event.item.layer.title} to the map`);
                }
                layerListElement?.openedLayers?.pop();
            }
        });
        layerListHandles.push(catalogLayerListActionHandle);
    }
    if (isUsingLayerListNext) {
        const catalogLayerListActionHandle = reactiveUtils.on(() => layerListElement.catalogLayerList, "arcgisTriggerAction", async (event) => {
            const { action, item } = event.detail;
            if (action.id === "add-layer") {
                try {
                    const parentCatalogLayer = getCatalogLayerForLayer(item.layer);
                    if (!parentCatalogLayer) {
                        return;
                    }
                    await addLayerFromDynamicGroup(item.layer);
                    alert(`Added ${item.layer.title} to the map`);
                }
                catch (error) {
                    console.error("Failed to add layer from dynamic group", error);
                    alert(`Unable to add ${item.layer.title} to the map`);
                }
                layerListElement?.openedLayers?.pop();
            }
        });
        layerListHandles.push(catalogLayerListActionHandle);
    }
    const catalogListHighlightWatchHandle = reactiveUtils.watch(() => layerListElement.catalogLayerList, () => {
        highlightHandle && highlightHandle.remove();
    });
    layerListHandles.push(catalogListHighlightWatchHandle);
    const catalogSelectionWatchHandle = reactiveUtils.watch(() => layerListElement.catalogLayerList?.selectedItems?.at(0)?.layer, (layer) => {
        layer && handleLayerSelection(layer);
    });
    layerListHandles.push(catalogSelectionWatchHandle);
    const selectedItemsChangeHandle = layerListElement.selectedItems?.on("change", (event) => {
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
    layerListHandles.push(selectedItemsChangeHandle);
    const selectedItemsWatchHandle = reactiveUtils.watch(() => layerListElement.selectedItems?.at(0)?.layer, (layer) => layer && handleLayerSelection(layer));
    layerListHandles.push(selectedItemsWatchHandle);
    if (!isUsingLayerListNext) {
        const tableListActionHandle = reactiveUtils.on(() => layerListElement.tableList, "trigger-action", (event) => {
            if (event.action.id === "information") {
                alert(`${event.item.layer.title}`);
            }
        });
        layerListHandles.push(tableListActionHandle);
    }
    if (isUsingLayerListNext) {
        const tableListActionHandle = reactiveUtils.on(() => layerListElement.tableList, "arcgisTriggerAction", (event) => {
            const { action, item } = event.detail;
            if (action.id === "information") {
                alert(`${item.layer?.title}`);
            }
        });
        layerListHandles.push(tableListActionHandle);
    }
    const tableSelectionWatchHandle = reactiveUtils.watch(() => layerListElement.tableList?.selectedItems?.at(0)?.layer, (layer) => {
        layer && handleLayerSelection(layer);
    });
    layerListHandles.push(tableSelectionWatchHandle);
    layerListElement.addEventListener("arcgisTriggerAction", (event) => {
        const { id } = event.detail.action;
        const { layer } = event.detail.item;
        const addGroupLayer = (parent, layers) => {
            const groupLayer = new GroupLayer({
                title: "New group layer",
            });
            const layerIndex = layers.findIndex((mapLayer) => layer === mapLayer);
            parent.add(groupLayer, layerIndex + 1);
            groupLayer.add(layer);
        };
        if (id === "add-group-layer" && layer) {
            if (layer.parent instanceof GroupLayer) {
                addGroupLayer(layer.parent, layer.parent.layers);
            }
            else if (layer.parent instanceof Map) {
                if (viewElement.map) {
                    addGroupLayer(layer.parent, viewElement.map.layers);
                }
            }
        }
        if (id === "zoom-to") {
            const fullExtent = layer.fullExtent;
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
    filterModeHandles.push(reactiveUtils.watch(() => (viewElement.map?.allLayers.filter((layer) => {
        if (!layer.fullExtent) {
            return false;
        }
        return viewElement.view.extent.intersects(layer.fullExtent);
    }) ?? []), (layers) => {
        activeLayerListElement.filterPredicate = (item) => {
            if (!item || !item.layer) {
                return false;
            }
            const layer = item.layer;
            return layers.includes(layer) && itemMatchesCurrentFilterText(item);
        };
    }, { initial: true }));
}
function showVisible() {
    clearFilterModeHandles();
    filterModeHandles.push(reactiveUtils.watch(() => (viewElement.map?.allLayers.filter((layer) => layer.visible) ?? []), (layers) => {
        activeLayerListElement.filterPredicate = (item) => {
            if (!item || !item.layer) {
                return false;
            }
            const layer = item.layer;
            return layers.includes(layer) && itemMatchesCurrentFilterText(item);
        };
    }, { initial: true }));
}
function syncPortalQueryParam(portal) {
    const url = new URL(window.location.href);
    url.searchParams.set("portal", portal);
    window.history.replaceState({}, "", url);
}
function syncWebmapQueryParam(webmap) {
    const url = new URL(window.location.href);
    url.searchParams.set("webmap", webmap);
    window.history.replaceState({}, "", url);
}
