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
        
        function deleteTextInComp(composition) {
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
        
        for (var i = 1; i <= comp.layers.length; i++) {
            var layer = comp.layers[i];
            if (layer.hasVideo) {
                var transform = layer.property("Transform");
                var position = transform.property("Position");
                
                var currentPos = position.value;
                var newY = currentPos[1] + (1080 - oldHeight) / 2;
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
        comp.duration = newDuration;
        
        function extendLayersInComp(composition, targetDuration) {
            var extendedCount = 0;
            for (var i = 1; i <= composition.layers.length; i++) {
                var layer = composition.layers[i];
                
                if (layer.outPoint < targetDuration) {
                    layer.outPoint = targetDuration;
                    extendedCount++;
                }
                
                if (layer.source && layer.source instanceof CompItem) {
                    if (layer.source.duration < targetDuration) {
                        layer.source.duration = targetDuration;
                        extendedCount += extendLayersInComp(layer.source, targetDuration);
                    }
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
            
            var position = transform.property("Position");
            if (position.numKeys > 0) {
                layerData.properties.position = [];
                for (var j = 1; j <= position.numKeys; j++) {
                    var keyTime = position.keyTime(j);
                    var relativeTime = (keyTime - layer.inPoint) / layerData.duration;
                    
                    layerData.properties.position.push({
                        relativeTime: relativeTime,
                        value: position.keyValue(j),
                        inInterpolationType: position.keyInInterpolationType(j),
                        outInterpolationType: position.keyOutInterpolationType(j),
                        inTemporalEase: position.keyInTemporalEase(j),
                        outTemporalEase: position.keyOutTemporalEase(j)
                    });
                }
            }
            
            var scale = transform.property("Scale");
            if (scale.numKeys > 0) {
                layerData.properties.scale = [];
                for (var j = 1; j <= scale.numKeys; j++) {
                    var keyTime = scale.keyTime(j);
                    var relativeTime = (keyTime - layer.inPoint) / layerData.duration;
                    
                    layerData.properties.scale.push({
                        relativeTime: relativeTime,
                        value: scale.keyValue(j),
                        inInterpolationType: scale.keyInInterpolationType(j),
                        outInterpolationType: scale.keyOutInterpolationType(j),
                        inTemporalEase: scale.keyInTemporalEase(j),
                        outTemporalEase: scale.keyOutTemporalEase(j)
                    });
                }
            }
            
            var rotation = transform.property("Rotation");
            if (rotation.numKeys > 0) {
                layerData.properties.rotation = [];
                for (var j = 1; j <= rotation.numKeys; j++) {
                    var keyTime = rotation.keyTime(j);
                    var relativeTime = (keyTime - layer.inPoint) / layerData.duration;
                    
                    layerData.properties.rotation.push({
                        relativeTime: relativeTime,
                        value: rotation.keyValue(j),
                        inInterpolationType: rotation.keyInInterpolationType(j),
                        outInterpolationType: rotation.keyOutInterpolationType(j),
                        inTemporalEase: rotation.keyInTemporalEase(j),
                        outTemporalEase: rotation.keyOutTemporalEase(j)
                    });
                }
            }
            
            var opacity = transform.property("Opacity");
            if (opacity.numKeys > 0) {
                layerData.properties.opacity = [];
                for (var j = 1; j <= opacity.numKeys; j++) {
                    var keyTime = opacity.keyTime(j);
                    var relativeTime = (keyTime - layer.inPoint) / layerData.duration;
                    
                    layerData.properties.opacity.push({
                        relativeTime: relativeTime,
                        value: opacity.keyValue(j),
                        inInterpolationType: opacity.keyInInterpolationType(j),
                        outInterpolationType: opacity.keyOutInterpolationType(j),
                        inTemporalEase: opacity.keyInTemporalEase(j),
                        outTemporalEase: opacity.keyOutTemporalEase(j)
                    });
                }
            }
            
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
            
            var layerPreset = presetData.layers[0];
            if (presetData.layers[i]) {
                layerPreset = presetData.layers[i];
            }
            
            if (layerPreset.properties.position) {
                var position = transform.property("Position");
                position.removeKey(1);
                for (var j = 0; j < layerPreset.properties.position.length; j++) {
                    var keyData = layerPreset.properties.position[j];
                    var keyTime = layer.inPoint + (keyData.relativeTime * layerDuration);
                    
                    if (presetType === "in" && keyData.relativeTime > 0.5) continue;
                    if (presetType === "out" && keyData.relativeTime < 0.5) continue;
                    
                    if (presetType === "out" && keyData.relativeTime >= 0.5) {
                        keyTime = layer.inPoint + ((keyData.relativeTime - 0.5) * 2 * (layerDuration * 0.5)) + (layerDuration * 0.5);
                    }
                    
                    position.setValueAtTime(keyTime, keyData.value);
                    
                    try {
                        var keyIndex = position.nearestKeyIndex(keyTime);
                        position.setInterpolationTypeAtKey(keyIndex, keyData.inInterpolationType, keyData.outInterpolationType);
                        if (keyData.inTemporalEase && keyData.outTemporalEase) {
                            position.setTemporalEaseAtKey(keyIndex, keyData.inTemporalEase, keyData.outTemporalEase);
                        }
                    } catch (e) {}
                }
            }
            
            if (layerPreset.properties.scale) {
                var scale = transform.property("Scale");
                for (var j = scale.numKeys; j >= 1; j--) {
                    scale.removeKey(j);
                }
                for (var j = 0; j < layerPreset.properties.scale.length; j++) {
                    var keyData = layerPreset.properties.scale[j];
                    var keyTime = layer.inPoint + (keyData.relativeTime * layerDuration);
                    
                    if (presetType === "in" && keyData.relativeTime > 0.5) continue;
                    if (presetType === "out" && keyData.relativeTime < 0.5) continue;
                    
                    if (presetType === "out" && keyData.relativeTime >= 0.5) {
                        keyTime = layer.inPoint + ((keyData.relativeTime - 0.5) * 2 * (layerDuration * 0.5)) + (layerDuration * 0.5);
                    }
                    
                    scale.setValueAtTime(keyTime, keyData.value);
                    
                    try {
                        var keyIndex = scale.nearestKeyIndex(keyTime);
                        scale.setInterpolationTypeAtKey(keyIndex, keyData.inInterpolationType, keyData.outInterpolationType);
                        if (keyData.inTemporalEase && keyData.outTemporalEase) {
                            scale.setTemporalEaseAtKey(keyIndex, keyData.inTemporalEase, keyData.outTemporalEase);
                        }
                    } catch (e) {}
                }
            }
            
            if (layerPreset.properties.rotation) {
                var rotation = transform.property("Rotation");
                for (var j = rotation.numKeys; j >= 1; j--) {
                    rotation.removeKey(j);
                }
                for (var j = 0; j < layerPreset.properties.rotation.length; j++) {
                    var keyData = layerPreset.properties.rotation[j];
                    var keyTime = layer.inPoint + (keyData.relativeTime * layerDuration);
                    
                    if (presetType === "in" && keyData.relativeTime > 0.5) continue;
                    if (presetType === "out" && keyData.relativeTime < 0.5) continue;
                    
                    if (presetType === "out" && keyData.relativeTime >= 0.5) {
                        keyTime = layer.inPoint + ((keyData.relativeTime - 0.5) * 2 * (layerDuration * 0.5)) + (layerDuration * 0.5);
                    }
                    
                    rotation.setValueAtTime(keyTime, keyData.value);
                    
                    try {
                        var keyIndex = rotation.nearestKeyIndex(keyTime);
                        rotation.setInterpolationTypeAtKey(keyIndex, keyData.inInterpolationType, keyData.outInterpolationType);
                        if (keyData.inTemporalEase && keyData.outTemporalEase) {
                            rotation.setTemporalEaseAtKey(keyIndex, keyData.inTemporalEase, keyData.outTemporalEase);
                        }
                    } catch (e) {}
                }
            }
            
            if (layerPreset.properties.opacity) {
                var opacity = transform.property("Opacity");
                for (var j = opacity.numKeys; j >= 1; j--) {
                    opacity.removeKey(j);
                }
                for (var j = 0; j < layerPreset.properties.opacity.length; j++) {
                    var keyData = layerPreset.properties.opacity[j];
                    var keyTime = layer.inPoint + (keyData.relativeTime * layerDuration);
                    
                    if (presetType === "in" && keyData.relativeTime > 0.5) continue;
                    if (presetType === "out" && keyData.relativeTime < 0.5) continue;
                    
                    if (presetType === "out" && keyData.relativeTime >= 0.5) {
                        keyTime = layer.inPoint + ((keyData.relativeTime - 0.5) * 2 * (layerDuration * 0.5)) + (layerDuration * 0.5);
                    }
                    
                    opacity.setValueAtTime(keyTime, keyData.value);
                    
                    try {
                        var keyIndex = opacity.nearestKeyIndex(keyTime);
                        opacity.setInterpolationTypeAtKey(keyIndex, keyData.inInterpolationType, keyData.outInterpolationType);
                        if (keyData.inTemporalEase && keyData.outTemporalEase) {
                            opacity.setTemporalEaseAtKey(keyIndex, keyData.inTemporalEase, keyData.outTemporalEase);
                        }
                    } catch (e) {}
                }
            }
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

function getFilesInFolder(folderPath) {
    try {
        var folder = new Folder(folderPath);
        if (!folder.exists) {
            return "ERROR: Папка не найдена: " + folderPath;
        }
        
        var files = folder.getFiles();
        var fileList = [];
        
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (file instanceof File) {
                var name = file.name.toLowerCase();
                if (name.match(/\.(jpg|jpeg|png|gif|bmp|tiff|psd|ai|mp4|mov|avi|mkv|wmv|flv)$/)) {
                    fileList.push({
                        name: file.name,
                        path: file.fsName,
                        size: file.length,
                        modified: file.modified
                    });
                }
            }
        }
        
        return "SUCCESS:" + JSON.stringify(fileList);
        
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