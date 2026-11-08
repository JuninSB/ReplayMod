
-- Replay Mod: client-side capture of replicated parts. No server-only access.
local env = (getgenv and getgenv()) or _G
if env.ReplayMod and env.ReplayMod.destroy and env.ReplayMod.destroy() == false then return end
local transport = (syn and syn.request) or (http and http.request) or http_request or request
local player = ps.LocalPlayer
assert(player, "Execute Replay Mod no cliente")
-- O envio local por HttpGet continua disponível se o request do executor falhar.
local gui = Instance.new("ScreenGui")
gui.Name = "ReplayMod"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.DisplayOrder = 20
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = player:WaitForChild("PlayerGui")
local panel = Instance.new("Frame")
panel.Size = UDim2.new(0.92, 0, 0, 0)
panel.AutomaticSize = Enum.AutomaticSize.Y
panel.AnchorPoint = Vector2.new(0, 0)
panel.Position = UDim2.new(0.04, 0, 0.08, 0)
panel.BackgroundColor3 = Color3.fromRGB(19, 23, 29)
panel.Parent = gui
local limit = Instance.new("UISizeConstraint", panel)
limit.MaxSize = Vector2.new(350, 310)
local panelScale = Instance.new("UIScale", panel)
Instance.new("UICorner", panel).CornerRadius = UDim.new(0, 14)
local padding = Instance.new("UIPadding", panel)
padding.PaddingLeft = UDim.new(0, 12)
padding.PaddingRight = UDim.new(0, 12)
padding.PaddingTop = UDim.new(0, 10)
padding.PaddingBottom = UDim.new(0, 8)
local layout = Instance.new("UIListLayout", panel)
layout.Padding = UDim.new(0, 6)
local function control(kind, text, height)
    local item = Instance.new(kind)
    item.Size = UDim2.new(1, 0, 0, height or 32)
    item.BackgroundColor3 = Color3.fromRGB(33, 40, 50)
    item.TextColor3 = Color3.fromRGB(237, 242, 248)
    item.Font = Enum.Font.Gotham
    item.TextSize = 12
    item.Text = text
    item.Parent = panel
    Instance.new("UICorner", item).CornerRadius = UDim.new(0, 8)
    return item
end
local bar = Instance.new("Frame")
bar.Size = UDim2.new(1, 0, 0, 28)
bar.BackgroundTransparency = 1
bar.Active = true
bar.Parent = panel
local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -38, 1, 0)
title.BackgroundTransparency = 1
title.TextColor3 = Color3.fromRGB(237, 242, 248)
title.Font = Enum.Font.GothamBold
title.TextSize = 13
title.TextXAlignment = Enum.TextXAlignment.Left
title.Text = "REPLAY"
title.Parent = bar
local minimize = Instance.new("TextButton")
minimize.Size = UDim2.fromOffset(30, 28)
minimize.Position = UDim2.new(1, -30, 0, 0)
minimize.Text = "−"
minimize.TextColor3 = title.TextColor3
minimize.BackgroundColor3 = Color3.fromRGB(33, 40, 50)
minimize.Font = Enum.Font.Gotham
minimize.TextSize = 17
minimize.Parent = bar
Instance.new("UICorner", minimize).CornerRadius = UDim.new(0, 8)
local code = control("TextBox", "")
code.PlaceholderText = "Código (somente servidor remoto)"
code.ClearTextOnFocus = false
code.Visible = not REPLAY_BASE_URL:find("127.0.0.1", 1, true)
local nameInput = control("TextBox", "")
nameInput.PlaceholderText = "Nome do replay"
nameInput.ClearTextOnFocus = false
local ticks = Instance.new("Frame")
ticks.Size = UDim2.new(1, 0, 0, 32)
ticks.BackgroundTransparency = 1
ticks.Parent = panel
local captureFps = 20
local nextSampleAt = 0
local tickRates = {5, 10, 20, 30, 60}
local tickIndex = 3
local tickColors = {
    [5] = Color3.fromRGB(56, 128, 240), [10] = Color3.fromRGB(43, 173, 100),
    [20] = Color3.fromRGB(217, 183, 50), [30] = Color3.fromRGB(233, 137, 43),
    [60] = Color3.fromRGB(225, 70, 65),
}
local tickButton = Instance.new("TextButton")
tickButton.Size = UDim2.new(1, 0, 1, 0)
tickButton.BackgroundColor3 = tickColors[captureFps]
tickButton.TextColor3 = Color3.fromRGB(18, 23, 29)
tickButton.Font = Enum.Font.GothamBold
tickButton.TextSize = 12
tickButton.Parent = ticks
Instance.new("UICorner", tickButton).CornerRadius = UDim.new(0, 7)
local function updateTickButton()
    tickButton.Text = tostring(captureFps) .. "/s  ·  tocar para mudar"
    tickButton.BackgroundColor3 = tickColors[captureFps]
end
updateTickButton()
local action = control("TextButton", "Gravar", 34)
action.BackgroundColor3 = Color3.fromRGB(30, 108, 82)
local send = control("TextButton", "Enviar", 32)
send.Visible = false
local status = control("TextLabel", "Captura incremental · 20/s", 28)
status.TextWrapped = true
status.BackgroundTransparency = 1
local close = control("TextButton", "Fechar", 28)
local fields = {code, nameInput, ticks, action, send, status, close}
local captured, encodedChunks = nil, nil
local frameBuffer, frameBufferBytes = {}, 0
local minimized = false
local keepPanelOnScreen
minimize.Activated:Connect(function()
    minimized = not minimized
    for _, item in ipairs(fields) do item.Visible = not minimized and (item ~= code or not REPLAY_BASE_URL:find("127.0.0.1", 1, true)) and (item ~= send or captured ~= nil) end
    if minimized then
        panel.AutomaticSize = Enum.AutomaticSize.None
        panel.Size = UDim2.fromOffset(146, 40)
    else
        panel.AutomaticSize = Enum.AutomaticSize.Y
        panel.Size = UDim2.new(0.92, 0, 0, 0)
    end
    minimize.Text = minimized and "+" or "−"
    title.Text = minimized and "REC ●" or "REPLAY"
    if keepPanelOnScreen then keepPanelOnScreen() end
end)
local recording, busy, disposed, preparing, paused = false, false, false, false, false
local pausedAt, pausedTotal = 0, 0
local connections, watch, decalWatch = {}, {}, {}
local graphicsWatch, clothingWatch = {}, {}
local ids = setmetatable({}, {__mode = "k"})
local decalIds = setmetatable({}, {__mode = "k"})
local nextId, nextDecalId, started, partCount = 0, 0, 0, 0
local previous, tracked, moving, dirty, dirtyQueue, removed = {}, {}, {}, {}, {}, {}
local decalPrevious, decalLast, trackedDecals = {}, {}, {}
local removedQueue = {}
local movingSet = {}
local lastValues, lastCamera, sampleCount = {}, nil, 0
local lastLighting = nil
local baseIndices, baseInstances, baseDecals, baseDecalSeen = {}, {}, {}, {}
local dirtyHead = 1
local removedHead = 1
local movingCursor = 1
local statsAt, statsSamples = 0, 0
local function api(path, payload, token)
    local url = REPLAY_BASE_URL .. path
    local body = hs:JSONEncode(payload)
    local headers = { ["Content-Type"] = "application/json", ["X-Upload-Token"] = token or "" }
    local ok, response = pcall(transport, {Url = url, Method = "POST", Headers = headers, Body = body})
    if not ok then response = tostring(response) end
    if type(response) == "table" then
        local sc = tonumber(response.StatusCode or response.Status) or 0
        if sc < 200 or sc >= 300 then error("HTTP " .. tostring(sc) .. ": " .. tostring(response.Body):sub(1, 180)) end
        local data = hs:JSONDecode(response.Body)
        if type(data) == "table" and data.error then error(tostring(data.error)) end
        return data
    end
    -- Real's request and DataModel HttpPost use different network paths.
    local fallbackOk, fallbackBody = pcall(function()
        return game:HttpPost(url, body, "application/json", headers)
    end)
    if not fallbackOk or type(fallbackBody) ~= "string" then
        error("POST local falhou: " .. tostring(response) .. " / " .. tostring(fallbackBody))
    end
    local decodedOk, data = pcall(function() return hs:JSONDecode(fallbackBody) end)
    if not decodedOk or type(data) ~= "table" then error("HttpPost: " .. fallbackBody:sub(1, 180)) end
    if data.error then error(tostring(data.error)) end
    return data
end
local function idOf(inst)
    if not ids[inst] then nextId += 1; ids[inst] = "part_" .. tostring(nextId) end
    return ids[inst]
end
local function decalIdOf(inst)
    if not decalIds[inst] then nextDecalId += 1; decalIds[inst] = "decal_" .. tostring(nextDecalId) end
    return decalIds[inst]
end
local function mark(inst, property)
    if not dirty[inst] then dirty[inst] = {}; table.insert(dirtyQueue, inst) end
    dirty[inst][property or "full"] = true
end
local function putBasePart(inst, data)
    local id = data.path
    local index = baseIndices[id]
    if index then captured.base.parts[index] = data
    else
        table.insert(captured.base.parts, data)
        baseIndices[id] = #captured.base.parts
    end
    baseInstances[id] = inst
end
local function rememberDecal(inst)
    if baseDecalSeen[inst] then return end
    baseDecalSeen[inst] = true
    table.insert(baseDecals, inst)
end
local function decalData(inst)
    local parent = inst.Parent
    return {id = decalIdOf(inst), partPath = idOf(parent), instancePath = pth(inst), className = inst.ClassName,
        face = tostring(inst.Face), texture = inst.Texture, transparency = inst.Transparency, color3 = hex(inst.Color3)}
end
local function trackDecal(inst, initial)
    if not inst:IsA("Decal") then return end
    if trackedDecals[inst] then
        if initial then rememberDecal(inst) end
        return
    end
    local parent = inst.Parent
    if not parent or not parent:IsA("BasePart") or not tracked[parent] then return end
    trackedDecals[inst] = true
    removed[decalIdOf(inst)] = nil
    decalWatch[inst] = inst.Changed:Connect(function()
        if recording or preparing then mark(inst, "full") end
    end)
    if initial then rememberDecal(inst) else mark(inst, "full") end
end
local function addMoving(inst)
    if movingSet[inst] then return end
    movingSet[inst] = true
    table.insert(moving, inst)
end
local function watchGraphic(inst)
    if graphicsWatch[inst] or not (inst:IsA("SpecialMesh") or inst:IsA("SurfaceAppearance")) then return end
    local parent = inst.Parent
    if not parent or not parent:IsA("BasePart") or not tracked[parent] then return end
    graphicsWatch[inst] = inst.Changed:Connect(function()
        if tracked[parent] and (recording or preparing) then mark(parent, "full") end
    end)
end
local function isClothing(inst)
    return inst:IsA("Shirt") or inst:IsA("Pants") or inst:IsA("ShirtGraphic")
end
local function markClothedParts(model)
    if not model or not model:IsA("Model") or not model:FindFirstChildOfClass("Humanoid") then return end
    for _, child in ipairs(model:GetChildren()) do
        if tracked[child] and child:IsA("BasePart") then
            local name = child.Name
            if name == "Torso" or name == "UpperTorso" or name == "LowerTorso"
                or name:match("Arm$") or name:match("Hand$")
                or name:match("Leg$") or name:match("Foot$") then
                mark(child, "full")
            end
        end
    end
end
local function watchClothing(inst)
    if clothingWatch[inst] or not isClothing(inst) then return end
    clothingWatch[inst] = inst.Changed:Connect(function()
        if recording or preparing then markClothedParts(inst.Parent) end
    end)
end
local function track(inst, initial)
    if not inst:IsA("BasePart") or inst:IsA("Terrain") or tracked[inst] then return end
    tracked[inst] = true
    partCount += 1
    local id = idOf(inst)
    removed[id] = nil
    watch[inst] = inst.Changed:Connect(function(prop)
        if prop == "Anchored" and not inst.Anchored then addMoving(inst) end
        if recording or preparing then mark(inst, prop) end
    end)
    local special = inst:FindFirstChildOfClass("SpecialMesh")
    local surface = inst:FindFirstChildOfClass("SurfaceAppearance")
    if special then watchGraphic(special) end
    if surface then watchGraphic(surface) end
    if not inst.Anchored then addMoving(inst) end
    if initial then
        local ok, data = pcall(partData, inst, id)
        if ok then
            previous[id] = true
            lastValues[id] = data
            putBasePart(inst, data)
        else mark(inst, "full") end
    else mark(inst) end
end
local function elapsedMs()
    return math.floor((os.clock() - started - pausedTotal - (paused and (os.clock() - pausedAt) or 0)) * 1000)
end
local function flushFrameBuffer()
    if not captured or #frameBuffer == 0 then return end
    local raw = "[" .. table.concat(frameBuffer, ",") .. "]"
    local block = {codec = "json", data = raw}
    if #raw <= 196608 and type(lz4compress) == "function" and type(base64_encode) == "function" then
        local ok, compressed = pcall(lz4compress, raw)
        if ok and type(compressed) == "string" then
            local encoded = base64_encode(compressed)
            if #encoded < #raw then block = {codec = "lz4", data = encoded, originalBytes = #raw} end
        end
    end
    table.insert(captured.frameBlocks, block)
    frameBuffer, frameBufferBytes = {}, 0
end
tickButton.Activated:Connect(function()
    tickIndex = tickIndex % #tickRates + 1
    captureFps = tickRates[tickIndex]
    updateTickButton()
    if captured and recording then
        table.insert(captured.tickChanges, {t = elapsedMs(), fps = captureFps})
        captured.stepMs = 1000 / captureFps
        statsAt, statsSamples = os.clock(), 0
        nextSampleAt = os.clock() + 1 / captureFps
    end
    status.Text = tostring(captureFps) .. " ticks/s" .. (captureFps == 60 and " · pode reduzir FPS" or "")
end)
local userInput = game:GetService("UserInputService")
local guiService = game:GetService("GuiService")
local dragInput, dragStart, panelStart = nil, nil, nil
keepPanelOnScreen = function()
    local camera = workspace.CurrentCamera
    local topInset, bottomInset = guiService:GetGuiInset()
    local viewportSize = camera and camera.ViewportSize or Vector2.new(800, 600)
    local screen = viewportSize + topInset + bottomInset
    local availableHeight = math.max(120, screen.Y - 20)
    local availableWidth = math.max(180, screen.X - 20)
    local nominalWidth = math.min(350, screen.X * 0.92)
    panelScale.Scale = math.min(1, availableHeight / 310, availableWidth / math.max(180, nominalWidth))
    task.defer(function()
        if not panel.Parent then return end
        local maxX = math.max(4, screen.X - panel.AbsoluteSize.X - 4)
        local maxY = math.max(4, screen.Y - panel.AbsoluteSize.Y - 4)
        panel.Position = UDim2.fromOffset(
            math.clamp(panel.AbsolutePosition.X, 4, maxX),
            math.clamp(panel.AbsolutePosition.Y, 0, maxY)
        )
    end)
end
keepPanelOnScreen()
local function beginPanelDrag(input)
    if input.UserInputType ~= Enum.UserInputType.MouseButton1 and input.UserInputType ~= Enum.UserInputType.Touch then return end
    dragInput = input
    dragStart = input.Position
    panelStart = panel.AbsolutePosition
end
title.Active = true
connections[#connections + 1] = bar.InputBegan:Connect(beginPanelDrag)
connections[#connections + 1] = title.InputBegan:Connect(beginPanelDrag)
connections[#connections + 1] = userInput.InputChanged:Connect(function(input)
    if not dragInput or not dragStart or not panelStart then return end
    if input ~= dragInput and not (dragInput.UserInputType == Enum.UserInputType.MouseButton1 and input.UserInputType == Enum.UserInputType.MouseMovement) then return end
    local delta = input.Position - dragStart
    local camera = workspace.CurrentCamera
    local viewportSize = camera and camera.ViewportSize or Vector2.new(800, 600)
    local topInset, bottomInset = guiService:GetGuiInset()
    local screen = viewportSize + topInset + bottomInset
    local maxX = math.max(4, screen.X - panel.AbsoluteSize.X - 4)
    local maxY = math.max(4, screen.Y - panel.AbsoluteSize.Y - 4)
    local x = math.clamp(panelStart.X + delta.X, 4, maxX)
    local y = math.clamp(panelStart.Y + delta.Y, 0, maxY)
    panel.Position = UDim2.fromOffset(x, y)
end)
connections[#connections + 1] = userInput.InputEnded:Connect(function(input)
    if input == dragInput then dragInput = nil end
end)
if workspace.CurrentCamera then
    connections[#connections + 1] = workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(keepPanelOnScreen)
end
local function readCamera()
    local camera = workspace.CurrentCamera
    if not camera then return nil end
    local x, y, z = camera.CFrame:ToOrientation()
    return {position = v3(camera.CFrame.Position), rotation = {x = x, y = y, z = z}, fov = camera.FieldOfView}
end
local function readLighting()
    local data = {
        brightness = lg.Brightness, clockTime = lg.ClockTime,
        ambient = hex(lg.Ambient), outdoorAmbient = hex(lg.OutdoorAmbient),
        fogColor = hex(lg.FogColor), fogStart = lg.FogStart, fogEnd = lg.FogEnd,
        exposureCompensation = lg.ExposureCompensation, globalShadows = lg.GlobalShadows,
        colorShiftTop = hex(lg.ColorShift_Top), colorShiftBottom = hex(lg.ColorShift_Bottom),
        environmentDiffuseScale = lg.EnvironmentDiffuseScale,
        environmentSpecularScale = lg.EnvironmentSpecularScale,
        shadowSoftness = lg.ShadowSoftness, geographicLatitude = lg.GeographicLatitude,
    }
    local ok, sun = pcall(function() return lg:GetSunDirection() end)
    if ok and sun then data.sunDirection = v3(sun) end
    local atmosphere = lg:FindFirstChildOfClass("Atmosphere")
    if atmosphere then
        data.atmosphere = {
            color = hex(atmosphere.Color), decay = hex(atmosphere.Decay),
            density = atmosphere.Density, haze = atmosphere.Haze, glare = atmosphere.Glare,
        }
    end
    local sky = lg:FindFirstChildOfClass("Sky")
    if sky then
        data.sky = {
            skyboxBk = tostring(sky.SkyboxBk), skyboxDn = tostring(sky.SkyboxDn),
            skyboxFt = tostring(sky.SkyboxFt), skyboxLf = tostring(sky.SkyboxLf),
            skyboxRt = tostring(sky.SkyboxRt), skyboxUp = tostring(sky.SkyboxUp),
            skyboxOrientation = v3(sky.SkyboxOrientation),
            starCount = sky.StarCount, celestialBodiesShown = sky.CelestialBodiesShown,
            sunAngularSize = sky.SunAngularSize, moonAngularSize = sky.MoonAngularSize,
        }
    end
    local effects = {}
    for _, effect in ipairs(lg:GetChildren()) do
        if effect:IsA("BloomEffect") then
            table.insert(effects, {className = effect.ClassName, enabled = effect.Enabled,
                intensity = effect.Intensity, size = effect.Size, threshold = effect.Threshold})
        elseif effect:IsA("ColorCorrectionEffect") then
            table.insert(effects, {className = effect.ClassName, enabled = effect.Enabled,
                brightness = effect.Brightness, contrast = effect.Contrast, saturation = effect.Saturation,
                tintColor = hex(effect.TintColor)})
        elseif effect:IsA("SunRaysEffect") then
            table.insert(effects, {className = effect.ClassName, enabled = effect.Enabled,
                intensity = effect.Intensity, spread = effect.Spread})
        elseif effect:IsA("BlurEffect") then
            table.insert(effects, {className = effect.ClassName, enabled = effect.Enabled, size = effect.Size})
        end
    end
    data.postEffects = effects
    return data
end
local function stop()
    recording = false
    preparing = false
    if captured then
        flushFrameBuffer()
        captured.durationMs = elapsedMs()
        captured.durMs = captured.durationMs
        status.Text = "Gravação pronta para enviar."
        action.Text = "Nova gravação"
        send.Visible = not minimized
    end
end
local function sameValue(a, b)
    if type(a) ~= type(b) then return false end
    if type(a) ~= "table" then return a == b end
    for key, value in pairs(a) do
        if not sameValue(value, b[key]) then return false end
    end
    for key in pairs(b) do
        if a[key] == nil then return false end
    end
    return true
end
local function partPatch(inst, id, props)
    local patch = {path = id}
    if props.full then
        local data = partData(inst, id)
        local prior = table.clone(lastValues[id] or {})
        local changed = false
        for key, value in pairs(data) do
            if key ~= "path" and not sameValue(prior[key], value) then
                patch[key] = value
                prior[key] = value
                changed = true
            end
        end
        for _, key in ipairs({"meshId", "textureId", "meshScale", "meshOffset", "surfaceAppearance", "characterName", "clothing"}) do
            if data[key] == nil and prior[key] ~= nil then
                local cleared = (key == "meshId" or key == "textureId" or key == "characterName") and "" or false
                if not sameValue(prior[key], cleared) then
                    patch[key] = cleared
                    prior[key] = cleared
                    changed = true
                end
            end
        end
        lastValues[id] = prior
        return changed and patch or nil
    end
    if props.full or props.CFrame or props.Position or props.Orientation then
        patch.position = v3(inst.Position)
        patch.orientation = v3(inst.Orientation)
    end
    if props.Size then patch.size = v3(inst.Size) end
    if props.Color then patch.color3 = hex(inst.Color) end
    if props.Transparency then patch.transparency = inst.Transparency end
    if props.Material then patch.material = inst.Material.Name end
    if props.Name then patch.name = inst.Name end
    if props.Name or props.Parent then
        local characterName = characterNameOf(inst)
        local previousName = lastValues[id] and lastValues[id].characterName
        if characterName or previousName then patch.characterName = characterName or "" end
    end
    if props.Anchored then patch.anchored = inst.Anchored end
    if props.CanCollide then patch.canCollide = inst.CanCollide end
    if props.CastShadow then patch.castShadow = inst.CastShadow end
    if props.MeshId and inst:IsA("MeshPart") then patch.meshId = tostring(inst.MeshId) end
    if props.TextureID and inst:IsA("MeshPart") then patch.textureId = tostring(inst.TextureID) end
    if props.Shape and inst:IsA("Part") then patch.shape = tostring(inst.Shape) end
    local prior = table.clone(lastValues[id] or {})
    local changed = false
    for key, value in pairs(patch) do
        if key ~= "path" then
            if sameValue(prior[key], value) then patch[key] = nil
            else prior[key] = value; changed = true end
        end
    end
    lastValues[id] = prior
    return changed and patch or nil
end
local function sample()
    local frame = {t = elapsedMs(), a = {}, u = {}, d = {}, da = {}, du = {}, dd = {}}
    local lighting = readLighting()
    if not sameValue(lighting, lastLighting) then
        frame.lighting = lighting
        lastLighting = lighting
    end
    local camera = readCamera()
    if camera and not sameValue(camera, lastCamera) then
        frame.camera = camera
        lastCamera = camera
    end
    local checked = 0
    while checked < 100 and #moving > 0 do
        if movingCursor > #moving then movingCursor = 1 end
        local inst = moving[movingCursor]
        if not tracked[inst] or not inst:IsDescendantOf(workspace) or inst.Anchored then
            movingSet[inst] = nil
            moving[movingCursor] = moving[#moving]
            moving[#moving] = nil
        else
            mark(inst, "CFrame")
            movingCursor += 1
        end
        checked += 1
    end
    local work = 0
    while dirtyHead <= #dirtyQueue and work < 100 do
        local inst = dirtyQueue[dirtyHead]
        dirtyHead += 1
        local props = dirty[inst] or {}
        dirty[inst] = nil
        work += 1
        if trackedDecals[inst] and inst:IsDescendantOf(workspace) and tracked[inst.Parent] then
            local id = decalIdOf(inst)
            local ok, data = pcall(decalData, inst)
            if ok then
                if not decalPrevious[id] then
                    table.insert(frame.da, data)
                    decalPrevious[id] = true
                elseif not sameValue(decalLast[id], data) then
                    table.insert(frame.du, data)
                end
                decalLast[id] = data
            end
        elseif trackedDecals[inst] then
            local id = decalIds[inst]
            if id and decalPrevious[id] then
                table.insert(frame.dd, id)
                decalPrevious[id], decalLast[id] = nil, nil
            end
        elseif tracked[inst] and inst:IsDescendantOf(workspace) then
            local id = idOf(inst)
            if not previous[id] then
                local ok, data = pcall(partData, inst, id)
                if ok then
                    previous[id] = true
                    lastValues[id] = data
                    table.insert(frame.a, data)
                end
            else
                local ok, patch = pcall(partPatch, inst, id, props)
                if ok and patch then table.insert(frame.u, patch) end
            end
        end
    end
    if dirtyHead > #dirtyQueue then dirtyQueue = {}; dirtyHead = 1 end
    local removals = 0
    while removedHead <= #removedQueue and removals < 100 do
        local id = removedQueue[removedHead]
        removedHead += 1
        removals += 1
        if removed[id] then
            if decalPrevious[id] then
                table.insert(frame.dd, id)
                decalPrevious[id], decalLast[id] = nil, nil
            elseif previous[id] then
                table.insert(frame.d, id)
                previous[id], lastValues[id] = nil, nil
            end
            removed[id] = nil
        end
    end
    if removedHead > #removedQueue then removedQueue = {}; removedHead = 1 end
    if #frame.a + #frame.u + #frame.d + #frame.da + #frame.du + #frame.dd > 0 or frame.camera or frame.lighting then
        local encoded = hs:JSONEncode(frame)
        table.insert(frameBuffer, encoded)
        frameBufferBytes += #encoded + 1
        if frameBufferBytes >= 16384 then flushFrameBuffer() end
    end
    sampleCount += 1
    statsSamples += 1
    local now = os.clock()
    local windowSeconds = now - statsAt
    if windowSeconds >= 1 then
        local pending = math.max(0, #dirtyQueue - dirtyHead + 1) + math.max(0, #removedQueue - removedHead + 1)
        status.Text = string.format("● %d alvo · %.1f real/s · %ds\n%d partes · %d pendentes",
            captureFps, statsSamples / windowSeconds, math.floor(elapsedMs() / 1000), partCount, pending)
        statsAt, statsSamples = now, 0
    end
end
local function walkWorkspace(visit)
    local stack = {{children = workspace:GetChildren(), index = 1}}
    local count = 0
    while #stack > 0 do
        local node = stack[#stack]
        local inst = node.children[node.index]
        if not inst then
            stack[#stack] = nil
        else
            node.index += 1
            if visit(inst) == false then return false end
            count += 1
            if count % 40 == 0 then task.wait() end
            local children = inst:GetChildren()
            if #children > 0 then stack[#stack + 1] = {children = children, index = 1} end
        end
    end
    return true
end
local function begin()
    preparing = true
    status.Text = "Preparando cena em lotes…"
    action.Text = "Preparando…"
    captured = {stepMs = 1000 / captureFps, captureFps = captureFps, tickChanges = {}, serverId = srvId(), placeId = game.PlaceId, replayName = nameInput.Text,
        base = {parts = {}, decals = {}, camera = readCamera(), lighting = readLighting()}, frameBlocks = {}, chatEvents = {}}
    lastLighting = captured.base.lighting
    encodedChunks = nil
    frameBuffer, frameBufferBytes = {}, 0
    previous, lastValues, dirty, dirtyQueue, removed, removedQueue = {}, {}, {}, {}, {}, {}
    decalPrevious, decalLast = {}, {}
    baseIndices, baseInstances, baseDecals, baseDecalSeen = {}, {}, {}, {}
    dirtyHead, removedHead, movingCursor = 1, 1, 1
    local completed = walkWorkspace(function(inst)
        if disposed or not preparing then return false end
        if inst:IsA("BasePart") then
            if tracked[inst] then
                local id = idOf(inst)
                local ok, data = pcall(partData, inst, id)
                if ok then
                    previous[id], lastValues[id] = true, data
                    putBasePart(inst, data)
                else mark(inst, "full") end
            else track(inst, true) end
        elseif inst:IsA("Decal") then
            trackDecal(inst, true)
        elseif isClothing(inst) then
            watchClothing(inst)
        end
    end)
    if not completed then return end
    local dirtyAtEnd = #dirtyQueue
    for i = dirtyHead, dirtyAtEnd do
        local inst = dirtyQueue[i]
        if tracked[inst] and inst:IsDescendantOf(workspace) then
            local id = idOf(inst)
            local ok, data = pcall(partData, inst, id)
            if ok then previous[id], lastValues[id] = true, data; putBasePart(inst, data) end
        end
        if i % 40 == 0 then task.wait() end
    end
    local baseParts = {}
    for _, data in ipairs(captured.base.parts) do
        local inst = baseInstances[data.path]
        if inst and tracked[inst] and inst:IsDescendantOf(workspace) then
            table.insert(baseParts, data)
        else
            previous[data.path], lastValues[data.path] = nil, nil
        end
    end
    captured.base.parts = baseParts
    for i, inst in ipairs(baseDecals) do
        if inst:IsDescendantOf(workspace) and inst.Parent and tracked[inst.Parent] and previous[ids[inst.Parent]] then
            local ok, data = pcall(decalData, inst)
            if ok then
                table.insert(captured.base.decals, data)
                decalPrevious[data.id], decalLast[data.id] = true, data
            end
        end
        if i % 40 == 0 then task.wait() end
    end
    started = os.clock()
    lastCamera = captured.base.camera
    sampleCount = 0
    statsAt, statsSamples = os.clock(), 0
    pausedTotal = 0
    paused = false
    recording = true
    preparing = false
    baseIndices, baseInstances, baseDecals, baseDecalSeen = {}, {}, {}, {}
    action.Text = "Pausar gravação"
    send.Visible = not minimized
    status.Text = "● Gravando a " .. tostring(captureFps) .. " ticks/s"
    nextSampleAt = os.clock() + 1 / captureFps
    task.spawn(function()
        while recording and not disposed do
            rs.Heartbeat:Wait()
            if not recording or disposed then break end
            local now = os.clock()
            local interval = 1 / captureFps
            if paused or preparing then
                nextSampleAt = now + interval
            elseif now >= nextSampleAt then
                nextSampleAt += interval
                local ok, err = pcall(sample)
                if not ok then stop(); status.Text = "Captura: " .. tostring(err); break end
                if nextSampleAt < os.clock() then nextSampleAt = os.clock() + interval end
            end
        end
    end)
end
connections[#connections + 1] = workspace.DescendantAdded:Connect(function(inst)
    if inst:IsA("BasePart") then
        if preparing and not recording and captured then track(inst, true)
        elseif recording and (not paused or preparing) then track(inst, false) end
    elseif inst:IsA("SpecialMesh") or inst:IsA("SurfaceAppearance") then
        watchGraphic(inst)
        local parent = inst.Parent
        if parent and tracked[parent] and (recording or preparing) then mark(parent, "full") end
    elseif inst:IsA("Decal") then
        if preparing and not recording and captured then trackDecal(inst, true)
        elseif recording and not paused then trackDecal(inst, false) end
    elseif isClothing(inst) then
        watchClothing(inst)
        if recording or preparing then markClothedParts(inst.Parent) end
    end
end)
connections[#connections + 1] = workspace.DescendantRemoving:Connect(function(inst)
    if trackedDecals[inst] then
        trackedDecals[inst] = nil
        if decalWatch[inst] then decalWatch[inst]:Disconnect(); decalWatch[inst] = nil end
        local id = decalIds[inst]
        if recording and id and not removed[id] then
            removed[id] = true
            table.insert(removedQueue, id)
        end
    end
    if graphicsWatch[inst] then graphicsWatch[inst]:Disconnect(); graphicsWatch[inst] = nil end
    if clothingWatch[inst] then clothingWatch[inst]:Disconnect(); clothingWatch[inst] = nil end
    if isClothing(inst) and (recording or preparing) then markClothedParts(inst.Parent) end
    if inst:IsA("SpecialMesh") or inst:IsA("SurfaceAppearance") then
        local parent = inst.Parent
        if parent and tracked[parent] and (recording or preparing) then mark(parent, "full") end
    end
    if not tracked[inst] then return end
    local id = ids[inst]
    tracked[inst] = nil
    partCount -= 1
    if watch[inst] then watch[inst]:Disconnect(); watch[inst] = nil end
    if recording and id and not removed[id] then
        removed[id] = true
        table.insert(removedQueue, id)
    end
end)
local chatService = game:GetService("TextChatService")
connections[#connections + 1] = chatService.MessageReceived:Connect(function(message)
    if not recording or paused or not captured then return end
    local source = message.TextSource
    local sender = source and ps:GetPlayerByUserId(source.UserId)
    table.insert(captured.chatEvents, {t = elapsedMs(),
        userId = source and source.UserId or 0, name = sender and sender.DisplayName or "Sistema",
        msg = tostring(message.Text):sub(1, 220)})
end)
local function chunksForReplay()
    if encodedChunks then return encodedChunks end
    flushFrameBuffer()
    status.Text = "Preparando blocos para envio…"
    local chunks, current = {}, ""
    local function append(text)
        local at = 1
        while at <= #text do
            local space = 196608 - #current
            if space < 4 then table.insert(chunks, current); current = ""; space = 196608 end
            local last = math.min(#text, at + space - 1)
            if last < #text then
                while last >= at and string.byte(text, last + 1) >= 128 and string.byte(text, last + 1) <= 191 do
                    last -= 1
                end
            end
            current ..= text:sub(at, last)
            at = last + 1
        end
    end
    append('{"serverId":' .. hs:JSONEncode(captured.serverId) .. ',"placeId":' .. hs:JSONEncode(captured.placeId)
        .. ',"replayName":' .. hs:JSONEncode(captured.replayName) .. ',"stepMs":' .. tostring(captured.stepMs) .. ',"captureFps":' .. tostring(captured.captureFps) .. ',"tickChanges":' .. hs:JSONEncode(captured.tickChanges) .. ',"durationMs":'
        .. tostring(captured.durationMs) .. ',"base":{"parts":[')
    for i, part in ipairs(captured.base.parts) do
        append((i > 1 and "," or "") .. hs:JSONEncode(part))
        if i % 20 == 0 then task.wait() end
    end
    append('],"decals":[')
    for i, decal in ipairs(captured.base.decals) do
        append((i > 1 and "," or "") .. hs:JSONEncode(decal))
        if i % 20 == 0 then task.wait() end
    end
    append('],"camera":' .. (captured.base.camera and hs:JSONEncode(captured.base.camera) or "null")
        .. ',"lighting":' .. hs:JSONEncode(captured.base.lighting) .. '},"frameBlocks":[')
    for i, block in ipairs(captured.frameBlocks) do
        append((i > 1 and "," or "") .. hs:JSONEncode(block))
        if i % 20 == 0 then task.wait() end
    end
    append('],"chatEvents":' .. hs:JSONEncode(captured.chatEvents) .. '}')
    if #current > 0 then table.insert(chunks, current) end
    encodedChunks = chunks
    return chunks
end
local function uploadByHttpGet(chunks, sid)
    if not REPLAY_BASE_URL:find("127.0.0.1", 1, true) then error("GET local indisponível fora do localhost") end
    local function pieceEnd(chunk, at)
        local last = math.min(#chunk, at + 3500 - 1)
        if last < #chunk then
            while last >= at and string.byte(chunk, last + 1) >= 128 and string.byte(chunk, last + 1) <= 191 do last -= 1 end
        end
        return last
    end
    local total = 0
    for _, chunk in ipairs(chunks) do
        local at = 1
        while at <= #chunk do
            at = pieceEnd(chunk, at) + 1
            total += 1
        end
    end
    local uploadId = hs:GenerateGUID(false)
    local result
    local index = 0
    for _, chunk in ipairs(chunks) do
        local at = 1
        while at <= #chunk do
            local last = pieceEnd(chunk, at)
            local piece = chunk:sub(at, last)
            local url = REPLAY_BASE_URL .. "/api/replay/local-chunk?uploadId=" .. hs:UrlEncode(uploadId)
                .. "&serverId=" .. hs:UrlEncode(sid) .. "&chunkIndex=" .. tostring(index)
                .. "&totalChunks=" .. tostring(total) .. "&chunkData=" .. hs:UrlEncode(piece)
            local ok, body = pcall(function() return game:HttpGet(url, true) end)
            if not ok then error("HttpGet local falhou: " .. tostring(body)) end
            local decodedOk, data = pcall(function() return hs:JSONDecode(body) end)
            if not decodedOk or type(data) ~= "table" then error("HttpGet local: " .. tostring(body):sub(1, 150)) end
            if data.error then error(tostring(data.error)) end
            result = data
            index += 1
            at = last + 1
            if index % 25 == 0 or index == total then
                status.Text = string.format("Enviando local %d/%d (%.0f%%)", index, total, index / total * 100)
                task.wait()
            end
        end
    end
    return result
end
local function upload()
    local sid = captured.serverId
    status.Text = "Autenticando…"
    local token, useLocalGet = nil, false
    if REPLAY_BASE_URL:find("127.0.0.1", 1, true) then
        local authenticated, reply = pcall(api, "/api/auth/local", {serverId = sid})
        if authenticated then token = reply.uploadToken
        else useLocalGet = true; status.Text = "POST indisponível; preparando envio local…" end
    else
        local ticket = api("/api/auth/redeem", {code = code.Text:gsub("%s", ""), serverId = sid})
        token = api("/api/auth/exchange", {ticket = ticket.ticket, serverId = sid}).uploadToken
    end
    local chunks = chunksForReplay()
    local uploadId = hs:GenerateGUID(false)
    local result
    if useLocalGet then result = uploadByHttpGet(chunks, sid) else
    for i, chunk in ipairs(chunks) do
        local sent, reply = pcall(api, "/api/replay/chunk", {uploadId = uploadId, serverId = sid,
            chunkIndex = i - 1, totalChunks = #chunks, chunkData = chunk}, token)
        if not sent then
            status.Text = "POST falhou; tentando envio local pelo HttpGet…"
            result = uploadByHttpGet(chunks, sid)
            break
        end
        result = reply
        if i % 4 == 0 or i == #chunks then
            status.Text = string.format("Enviando %d/%d blocos (%.0f%%)", i, #chunks, i / #chunks * 100)
            task.wait()
        end
    end
    end
    if not result or not result.ok or not result.replayId then error("Envio terminou sem confirmação do servidor") end
    status.Text = "Salvo: " .. tostring(result.replayName)
    captured, encodedChunks = nil, nil
    send.Visible = false
    action.Text = "Iniciar gravação"
end
connections[#connections + 1] = action.Activated:Connect(function()
    if busy or disposed or preparing then return end
    if recording then
        paused = not paused
        if paused then
            pausedAt = os.clock()
            action.Text = "Retomar gravação"
            status.Text = "Pausado · pronto para retomar ou enviar"
        else
            preparing = true
            action.Text = "Retomando…"
            task.spawn(function()
                walkWorkspace(function(inst)
                    if disposed or not preparing then return false end
                    if inst:IsA("BasePart") then track(inst, false) end
                    if inst:IsA("Decal") then trackDecal(inst, false) end
                end)
                if disposed or not preparing then return end
                for inst in pairs(tracked) do mark(inst) end
                for inst in pairs(trackedDecals) do mark(inst) end
                pausedTotal += os.clock() - pausedAt
                paused = false
                preparing = false
                statsAt, statsSamples = os.clock(), 0
                action.Text = "Pausar gravação"
                status.Text = "● Gravando a " .. tostring(captureFps) .. " ticks/s"
            end)
        end
        return
    end
    if captured then
        status.Text = "Envie ou descarte a gravação atual."
        return
    end
    busy = true
    task.spawn(function()
        local ok, err = pcall(begin)
        busy = false
        if not ok then
            preparing, recording = false, false
            status.Text = tostring(err)
            action.Text = captured and "Nova gravação" or "Iniciar gravação"
        end
    end)
end)
connections[#connections + 1] = send.Activated:Connect(function()
    if busy or preparing or not captured then return end
    if recording then stop() end
    busy = true
    send.Text = "Enviando…"
    task.spawn(function()
        local ok, err = pcall(upload)
        busy = false
        send.Text = "Enviar gravação"
        if not ok then
            status.Text = tostring(err)
            send.Visible = not minimized
        end
    end)
end)
local function destroy()
    if busy or preparing then status.Text = "Aguarde a operação terminar"; return false end
    if recording then stop(); return false end
    if captured and close.Text ~= "Descartar e fechar" then close.Text = "Descartar e fechar"; return false end
    disposed = true
    for _, connection in ipairs(connections) do connection:Disconnect() end
    for _, connection in pairs(watch) do connection:Disconnect() end
    for _, connection in pairs(decalWatch) do connection:Disconnect() end
    for _, connection in pairs(graphicsWatch) do connection:Disconnect() end
    for _, connection in pairs(clothingWatch) do connection:Disconnect() end
    gui:Destroy()
    env.ReplayMod = nil
    return true
end
connections[#connections + 1] = close.Activated:Connect(destroy)
env.ReplayMod = {stop = stop, destroy = destroy, getReplay = function() return captured end}
