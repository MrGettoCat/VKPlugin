function CSInterface() {
    "use strict";
}

CSInterface.prototype.evalScript = function(script, callback) {
    if (callback === null || callback === undefined) {
        callback = function(result) {};
    }
    
    window.__adobe_cep__.evalScript(script, callback);
};

CSInterface.prototype.addEventListener = function(type, listener, obj) {
    window.__adobe_cep__.addEventListener(type, listener, obj);
};

CSInterface.prototype.removeEventListener = function(type, listener, obj) {
    window.__adobe_cep__.removeEventListener(type, listener, obj);
};

CSInterface.prototype.requestOpenExtension = function(extensionId, params) {
    window.__adobe_cep__.requestOpenExtension(extensionId, params);
};

CSInterface.prototype.getSystemPath = function(pathType) {
    var path = decodeURI(window.__adobe_cep__.getSystemPath(pathType));
    var OSVersion = this.getOSInformation();
    if (OSVersion.indexOf("Windows") >= 0) {
        path = path.replace("file:///", "");
    } else if (OSVersion.indexOf("Mac") >= 0) {
        path = path.replace("file://", "");
    }
    return path;
};

CSInterface.prototype.getOSInformation = function() {
    var userAgent = navigator.userAgent;
    
    if (navigator.platform == "Win32" || navigator.platform == "Windows") {
        return "Windows";
    } else if (navigator.platform == "MacIntel" || navigator.platform == "Macintosh") {
        return "Mac";
    }
    
    return "Unknown";
};

CSInterface.prototype.getApplicationID = function() {
    return window.__adobe_cep__.getApplicationID();
};

CSInterface.prototype.getHostEnvironment = function() {
    return JSON.parse(window.__adobe_cep__.getHostEnvironment());
};

CSInterface.prototype.closeExtension = function() {
    window.__adobe_cep__.closeExtension();
};

CSInterface.prototype.getExtensions = function(extensionIds) {
    return JSON.parse(window.__adobe_cep__.getExtensions(extensionIds));
};

CSInterface.prototype.getNetworkPreferences = function() {
    return JSON.parse(window.__adobe_cep__.getNetworkPreferences());
};

CSInterface.prototype.initResourceBundle = function(resourceBundle, locale) {
    return window.__adobe_cep__.initResourceBundle(resourceBundle, locale);
};

CSInterface.prototype.dumpInstallationInfo = function() {
    return window.__adobe_cep__.dumpInstallationInfo();
};

CSInterface.prototype.getScaleFactor = function() {
    return window.__adobe_cep__.getScaleFactor();
};

CSInterface.prototype.setScaleFactorChangedHandler = function(handler) {
    window.__adobe_cep__.setScaleFactorChangedHandler(handler);
};

CSInterface.prototype.getCurrentApiVersion = function() {
    return JSON.parse(window.__adobe_cep__.getCurrentApiVersion());
};

CSInterface.prototype.getCurrentImsUserId = function() {
    return window.__adobe_cep__.getCurrentImsUserId();
};

CSInterface.prototype.getHostCapabilities = function() {
    return JSON.parse(window.__adobe_cep__.getHostCapabilities());
};

CSInterface.prototype.getMonitorSkinInfo = function(monitorId) {
    return window.__adobe_cep__.getMonitorSkinInfo(monitorId);
};

CSInterface.prototype.launchInDefaultBrowser = function(url) {
    return window.__adobe_cep__.launchInDefaultBrowser(url);
};

CSInterface.SYSTEM_PATH = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles",
    MY_DOCUMENTS: "myDocuments",
    APPLICATION: "application",
    EXTENSION: "extension",
    HOST_APPLICATION: "hostApplication"
};

CSInterface.THEME_COLOR_CHANGED_EVENT = "com.adobe.csxs.events.ThemeColorChanged";

window.csi = new CSInterface();

var FileUtils = {
    readFile: function(filePath, callback) {
        var script = `
            (function() {
                var file = new File("${filePath.replace(/\\/g, '\\\\')}");
                if (file.exists) {
                    file.open('r');
                    var content = file.read();
                    file.close();
                    return content;
                } else {
                    return null;
                }
            })()
        `;
        
        window.csi.evalScript(script, callback);
    },
    
    writeFile: function(filePath, content, callback) {
        var script = `
            (function() {
                var file = new File("${filePath.replace(/\\/g, '\\\\')}");
                file.open('w');
                file.write("${content.replace(/"/g, '\\"').replace(/\n/g, '\\n')}");
                file.close();
                return true;
            })()
        `;
        
        window.csi.evalScript(script, callback);
    },
    
    getFilesInFolder: function(folderPath, callback) {
        var script = `
            (function() {
                var folder = new Folder("${folderPath.replace(/\\/g, '\\\\')}");
                if (!folder.exists) {
                    return "[]";
                }
                
                var files = folder.getFiles();
                var fileList = [];
                
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    if (file instanceof File) {
                        var name = file.name.toLowerCase();
                        if (name.match(/\\.(jpg|jpeg|png|gif|bmp|tiff|mp4|mov|avi|mkv)$/)) {
                            fileList.push(file.name);
                        }
                    }
                }
                
                return JSON.stringify(fileList);
            })()
        `;
        
        window.csi.evalScript(script, function(result) {
            try {
                var files = JSON.parse(result);
                files = files.map(function(name) {
                    try {
                        return decodeURIComponent(name);
                    } catch (e) {
                        return name;
                    }
                });
                callback(files);
            } catch (e) {
                callback([]);
            }
        });
    },
    
    fileExists: function(filePath, callback) {
        var script = `
            (function() {
                var file = new File("${filePath.replace(/\\/g, '\\\\')}");
                return file.exists;
            })()
        `;
        
        window.csi.evalScript(script, callback);
    }
};

var AEUtils = {
    getActiveComp: function(callback) {
        var script = `
            (function() {
                var comp = app.project.activeItem;
                if (comp && comp instanceof CompItem) {
                    return JSON.stringify({
                        name: comp.name,
                        width: comp.width,
                        height: comp.height,
                        duration: comp.duration,
                        frameRate: comp.frameRate
                    });
                }
                return null;
            })()
        `;
        
        window.csi.evalScript(script, function(result) {
            try {
                var comp = result ? JSON.parse(result) : null;
                callback(comp);
            } catch (e) {
                callback(null);
            }
        });
    },
    
    getSelectedLayers: function(callback) {
        var script = `
            (function() {
                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    return "[]";
                }
                
                var selectedLayers = comp.selectedLayers;
                var layerInfo = [];
                
                for (var i = 0; i < selectedLayers.length; i++) {
                    var layer = selectedLayers[i];
                    layerInfo.push({
                        name: layer.name,
                        index: layer.index,
                        startTime: layer.startTime,
                        inPoint: layer.inPoint,
                        outPoint: layer.outPoint
                    });
                }
                
                return JSON.stringify(layerInfo);
            })()
        `;
        
        window.csi.evalScript(script, function(result) {
            try {
                var layers = JSON.parse(result);
                callback(layers);
            } catch (e) {
                callback([]);
            }
        });
    }
};

window.csi.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, function(event) {
    console.log("Theme changed:", event);
});

document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.csi === 'undefined') {
        console.error('CEP Interface не найден');
        return;
    }
    
    var hostInfo = window.csi.getHostEnvironment();
    console.log('Host Info:', hostInfo);
    
    var scaleFactor = window.csi.getScaleFactor();
    if (scaleFactor > 1) {
        document.body.style.zoom = scaleFactor;
    }
    
    updateHostScriptFunctions();
});

function updateHostScriptFunctions() {
    window.csi.evalScript(`
        function addFileToComposition(filePath, duration) {
            try {
                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    return "ERROR: Не выбрана активная композиция";
                }
                
                var file = new File(filePath);
                if (!file.exists) {
                    return "ERROR: Файл не найден: " + file.fsName;
                }
                
                app.beginUndoGroup("Добавить файл в композицию");
                
                var importOptions = new ImportOptions(file);
                var footage = app.project.importFile(importOptions);
                var layer = comp.layers.add(footage);
                
                var frameDuration = duration / comp.frameRate;
                layer.outPoint = layer.inPoint + frameDuration;
                
                app.endUndoGroup();
                
                return "SUCCESS: Файл " + file.name + " добавлен с длительностью " + duration + " кадров";
                
            } catch (error) {
                app.endUndoGroup();
                return "ERROR: " + error.toString();
            }
        }

        function deleteAllTextLayers() {
            try {
                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    return "ERROR: Не выбрана активная композиция";
                }
                
                app.beginUndoGroup("Удалить все текстовые слои");
                
                var deletedCount = 0;
                var processedComps = [];
                
                function deleteTextInComp(composition) {
                    if (processedComps.indexOf(composition.id) !== -1) {
                        return 0;
                    }
                    processedComps.push(composition.id);
                    
                    var localDeleted = 0;
                    for (var i = composition.layers.length; i >= 1; i--) {
                        var layer = composition.layers[i];
                        if (layer instanceof TextLayer) {
                            layer.remove();
                            localDeleted++;
                        } else if (layer.source && layer.source instanceof CompItem) {
                            localDeleted += deleteTextInComp(layer.source);
                        }
                    }
                    return localDeleted;
                }
                
                deletedCount = deleteTextInComp(comp);
                
                app.endUndoGroup();
                
                return "SUCCESS: Удалено текстовых слоёв: " + deletedCount;
                
            } catch (error) {
                app.endUndoGroup();
                return "ERROR: " + error.toString();
            }
        }

        function changeCompToSquare() {
            try {
                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    return "ERROR: Не выбрана активная композиция";
                }
                
                app.beginUndoGroup("Изменить размер композиции");
                
                var oldWidth = comp.width;
                var oldHeight = comp.height;
                
                comp.width = 1080;
                comp.height = 1080;
                
                var offsetY = (oldHeight - 1080) / 2;
                
                for (var i = 1; i <= comp.layers.length; i++) {
                    var layer = comp.layers[i];
                    if (layer.hasVideo) {
                        var transform = layer.property("Transform");
                        var position = transform.property("Position");
                        
                        var currentPos = position.value;
                        var newY = currentPos[1] - offsetY;
                        position.setValue([currentPos[0], newY]);
                    }
                }
                
                app.endUndoGroup();
                
                return "SUCCESS: Размер композиции изменён с " + oldWidth + "x" + oldHeight + " на 1080x1080";
                
            } catch (error) {
                app.endUndoGroup();
                return "ERROR: " + error.toString();
            }
        }

        function extendCompositionDuration(newDuration) {
            try {
                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    return "ERROR: Не выбрана активная композиция";
                }
                
                app.beginUndoGroup("Изменить длительность композиции");
                
                var oldDuration = comp.duration;
                var processedComps = [];
                
                function extendLayersInComp(composition, targetDuration) {
                    if (processedComps.indexOf(composition.id) !== -1) {
                        return 0;
                    }
                    processedComps.push(composition.id);
                    
                    composition.duration = targetDuration;
                    
                    var extendedCount = 0;
                    for (var i = 1; i <= composition.layers.length; i++) {
                        var layer = composition.layers[i];
                        
                        if (layer.outPoint < targetDuration) {
                            layer.outPoint = targetDuration;
                            extendedCount++;
                        }
                        
                        if (layer.source && layer.source instanceof CompItem) {
                            extendedCount += extendLayersInComp(layer.source, targetDuration);
                        }
                    }
                    return extendedCount;
                }
                
                var extendedLayers = extendLayersInComp(comp, newDuration);
                
                app.endUndoGroup();
                
                return "SUCCESS: Длительность композиции изменена с " + oldDuration.toFixed(2) + " на " + newDuration.toFixed(2) + " секунд. Расширено слоёв: " + extendedLayers;
                
            } catch (error) {
                app.endUndoGroup();
                return "ERROR: " + error.toString();
            }
        }

        function offsetSelectedLayers(offsetFrames) {
            try {
                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    return "ERROR: Не выбрана активная композиция";
                }
                
                var selectedLayers = comp.selectedLayers;
                if (selectedLayers.length === 0) {
                    return "ERROR: Не выбраны слои для сдвига";
                }
                
                app.beginUndoGroup("Сдвинуть выделенные слои");
                
                var offsetTime = offsetFrames / comp.frameRate;
                
                for (var i = 0; i < selectedLayers.length; i++) {
                    var layer = selectedLayers[i];
                    layer.startTime += offsetTime;
                }
                
                app.endUndoGroup();
                
                return "SUCCESS: Сдвинуто слоёв: " + selectedLayers.length + " на " + offsetFrames + " кадров";
                
            } catch (error) {
                app.endUndoGroup();
                return "ERROR: " + error.toString();
            }
        }

        function saveAnimationPreset(animationType) {
            try {
                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    return "ERROR: Не выбрана активная композиция";
                }
                
                var selectedLayers = comp.selectedLayers;
                if (selectedLayers.length === 0) {
                    return "ERROR: Не выбраны слои для сохранения пресета";
                }
                
                var presetData = {
                    type: animationType,
                    layers: []
                };
                
                for (var i = 0; i < selectedLayers.length; i++) {
                    var layer = selectedLayers[i];
                    var layerData = {
                        name: layer.name,
                        inPoint: layer.inPoint,
                        outPoint: layer.outPoint,
                        duration: layer.outPoint - layer.inPoint,
                        properties: {}
                    };
                    
                    var transform = layer.property("Transform");
                    
                    function saveProperty(prop, propName) {
                        if (prop.numKeys > 0) {
                            layerData.properties[propName] = [];
                            for (var j = 1; j <= prop.numKeys; j++) {
                                var keyTime = prop.keyTime(j);
                                var relativeTime = (keyTime - layer.inPoint) / layerData.duration;
                                
                                var keyData = {
                                    relativeTime: relativeTime,
                                    value: prop.keyValue(j),
                                    inInterpolationType: prop.keyInInterpolationType(j),
                                    outInterpolationType: prop.keyOutInterpolationType(j)
                                };
                                
                                try {
                                    keyData.inTemporalEase = prop.keyInTemporalEase(j);
                                    keyData.outTemporalEase = prop.keyOutTemporalEase(j);
                                } catch (e) {}
                                
                                layerData.properties[propName].push(keyData);
                            }
                        }
                    }
                    
                    saveProperty(transform.property("Position"), "position");
                    saveProperty(transform.property("Scale"), "scale");
                    saveProperty(transform.property("Rotation"), "rotation");
                    saveProperty(transform.property("Opacity"), "opacity");
                    
                    presetData.layers.push(layerData);
                }
                
                return "SUCCESS:" + JSON.stringify(presetData);
                
            } catch (error) {
                return "ERROR: " + error.toString();
            }
        }

        function applyAnimationPreset(presetDataJson, presetType, applyTarget) {
            try {
                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    return "ERROR: Не выбрана активная композиция";
                }
                
                var selectedLayers = comp.selectedLayers;
                if (selectedLayers.length === 0) {
                    return "ERROR: Не выбраны слои для применения пресета";
                }
                
                var presetData = JSON.parse(presetDataJson);
                
                app.beginUndoGroup("Применить пресет анимации");
                
                var layersToProcess = applyTarget === "single" ? [selectedLayers[0]] : selectedLayers;
                
                for (var i = 0; i < layersToProcess.length; i++) {
                    var layer = layersToProcess[i];
                    var layerDuration = layer.outPoint - layer.inPoint;
                    var transform = layer.property("Transform");
                    
                    var layerPreset = presetData.layers[Math.min(i, presetData.layers.length - 1)];
                    
                    function applyProperty(prop, propName) {
                        if (layerPreset.properties[propName]) {
                            for (var j = prop.numKeys; j >= 1; j--) {
                                prop.removeKey(j);
                            }
                            
                            var keys = layerPreset.properties[propName];
                            for (var j = 0; j < keys.length; j++) {
                                var keyData = keys[j];
                                var keyTime;
                                
                                if (presetType === "inout") {
                                    keyTime = layer.inPoint + (keyData.relativeTime * layerDuration);
                                } else if (presetType === "in") {
                                    if (keyData.relativeTime > 0.5) continue;
                                    keyTime = layer.inPoint + (keyData.relativeTime * 2 * layerDuration);
                                } else if (presetType === "out") {
                                    if (keyData.relativeTime < 0.5) continue;
                                    var outRelativeTime = (keyData.relativeTime - 0.5) * 2;
                                    keyTime = layer.inPoint + layerDuration - (outRelativeTime * layerDuration);
                                }
                                
                                prop.setValueAtTime(keyTime, keyData.value);
                                
                                try {
                                    var keyIndex = prop.nearestKeyIndex(keyTime);
                                    prop.setInterpolationTypeAtKey(keyIndex, keyData.inInterpolationType, keyData.outInterpolationType);
                                    if (keyData.inTemporalEase && keyData.outTemporalEase) {
                                        prop.setTemporalEaseAtKey(keyIndex, keyData.inTemporalEase, keyData.outTemporalEase);
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                    
                    applyProperty(transform.property("Position"), "position");
                    applyProperty(transform.property("Scale"), "scale");
                    applyProperty(transform.property("Rotation"), "rotation");
                    applyProperty(transform.property("Opacity"), "opacity");
                }
                
                app.endUndoGroup();
                
                return "SUCCESS: Пресет применён к " + layersToProcess.length + " слоям";
                
            } catch (error) {
                app.endUndoGroup();
                return "ERROR: " + error.toString();
            }
        }

        function loadPresetsFromFile(filePath) {
            try {
                var file = new File(filePath);
                if (!file.exists) {
                    return "SUCCESS:[]";
                }
                
                file.open('r');
                var content = file.read();
                file.close();
                
                return "SUCCESS:" + content;
                
            } catch (error) {
                return "ERROR: " + error.toString();
            }
        }

        function savePresetsToFile(filePath, presetsJson) {
            try {
                var file = new File(filePath);
                file.open('w');
                file.write(presetsJson);
                file.close();
                
                return "SUCCESS: Пресеты сохранены";
                
            } catch (error) {
                return "ERROR: " + error.toString();
            }
        }

        function getProjectInfo() {
            try {
                var comp = app.project.activeItem;
                var info = {
                    hasActiveComp: false,
                    projectName: app.project.file ? app.project.file.name : "Untitled",
                    totalComps: 0
                };
                
                for (var i = 1; i <= app.project.items.length; i++) {
                    if (app.project.items[i] instanceof CompItem) {
                        info.totalComps++;
                    }
                }
                
                if (comp && comp instanceof CompItem) {
                    info.hasActiveComp = true;
                    info.activeComp = {
                        name: comp.name,
                        width: comp.width,
                        height: comp.height,
                        duration: comp.duration,
                        frameRate: comp.frameRate,
                        currentTime: comp.time,
                        selectedLayers: comp.selectedLayers.length,
                        totalLayers: comp.layers.length
                    };
                }
                
                return "SUCCESS:" + JSON.stringify(info);
                
            } catch (error) {
                return "ERROR: " + error.toString();
            }
        }
    `);
}

window.CSInterface = CSInterface;
window.FileUtils = FileUtils;
window.AEUtils = AEUtils;