local hs = game:GetService("HttpService")
local lg = game:GetService("Lighting")
local ps = game:GetService("Players")
local rs = game:GetService("RunService")

local function srvId()
    if not rs:IsStudio() then
        local jid = tostring(game.JobId or ""):gsub("%s+", "")
        if jid ~= "" then
            return jid
        end
    end
    if rs:IsStudio() then
        return "studio-" .. tostring(game.PlaceId) .. "-local"
    end
    local jid = tostring(game.JobId or ""):gsub("%s+", "")
    if jid ~= "" then
        return jid
    end
    return "server-" .. tostring(game.PlaceId) .. "-fallback"
end


local function hex(c)
    local r = math.floor(c.R * 255 + 0.5)
    local g = math.floor(c.G * 255 + 0.5)
    local b = math.floor(c.B * 255 + 0.5)
    return string.format("#%02x%02x%02x", r, g, b)
end

local function v3(v)
    local function rounded(n)
        return math.floor(n * 1000 + 0.5) / 1000
    end
    return { x = rounded(v.X), y = rounded(v.Y), z = rounded(v.Z) }
end


local function pth(i)
    local function seg(inst)
        local name = inst.Name
        local parent = inst.Parent
        if not parent then
            return name
        end
        local idx = 1
        for _, sib in ipairs(parent:GetChildren()) do
            if sib == inst then
                break
            end
            if sib.Name == name and sib.ClassName == inst.ClassName then
                idx += 1
            end
        end
        if idx > 1 then
            return name .. "#" .. tostring(idx)
        end
        return name
    end

    local p = seg(i)
    local c = i.Parent
    while c and c ~= game do
        p = seg(c) .. "/" .. p
        c = c.Parent
    end
    return p
end

local function characterNameOf(part)
    if part.Name ~= "Head" then return nil end
    local model = part.Parent
    if not model or not model:IsA("Model") or not model:FindFirstChildOfClass("Humanoid") then return nil end
    return model.Name
end

local function partData(p, stablePath)
    local materialName = ""
    local okMat, matValue = pcall(function()
        return p.Material
    end)
    if okMat and matValue then
        local okMatName, matName = pcall(function()
            return matValue.Name
        end)
        if okMatName and matName then
            materialName = tostring(matName)
        else
            materialName = tostring(matValue):gsub("^Enum%.Material%.", "")
        end
    end
    local data = {
        path = stablePath or pth(p),
        instancePath = pth(p),
        name = p.Name,
        className = p.ClassName,
        position = v3(p.Position),
        size = v3(p.Size),
        orientation = v3(p.Orientation),
        color3 = hex(p.Color),
        transparency = p.Transparency,
        material = materialName ~= "" and materialName or "Plastic",
        anchored = p.Anchored,
        canCollide = p.CanCollide,
        castShadow = p.CastShadow,
    }
    local characterName = characterNameOf(p)
    if characterName then
        data.characterName = characterName
        local humanoid = p.Parent:FindFirstChildOfClass("Humanoid")
        data.characterHealth = humanoid.Health
        data.nameDisplayDistance = humanoid.NameDisplayDistance
        data.showName = humanoid.DisplayDistanceType ~= Enum.HumanoidDisplayDistanceType.None
        local owner = ps:GetPlayerFromCharacter(p.Parent)
        if owner then data.characterName = owner.DisplayName end
    end
    if p:IsA("Part") then
        data.shape = tostring(p.Shape)
        data.topSurface = tostring(p.TopSurface)
        data.bottomSurface = tostring(p.BottomSurface)
        data.leftSurface = tostring(p.LeftSurface)
        data.rightSurface = tostring(p.RightSurface)
        data.frontSurface = tostring(p.FrontSurface)
        data.backSurface = tostring(p.BackSurface)
    end
    if p:IsA("MeshPart") then
        data.meshId = tostring(p.MeshId)
        data.textureId = tostring(p.TextureID)
        data.doubleSided = p.DoubleSided
        local okSize, meshSize = pcall(function() return p.MeshSize end)
        if okSize and meshSize then data.meshSize = v3(meshSize) end
    end
    local special = p:FindFirstChildOfClass("SpecialMesh")
    if special then
        data.meshType = tostring(special.MeshType)
        data.meshId = tostring(special.MeshId)
        data.textureId = tostring(special.TextureId)
        data.meshScale = v3(special.Scale)
        data.meshOffset = v3(special.Offset)
        data.meshVertexColor = v3(special.VertexColor)
    end
    local surface = p:FindFirstChildOfClass("SurfaceAppearance")
    if surface then
        data.surfaceAppearance = {colorMap = tostring(surface.ColorMap), normalMap = tostring(surface.NormalMap),
            metalnessMap = tostring(surface.MetalnessMap), roughnessMap = tostring(surface.RoughnessMap)}
        local okColor, surfaceColor = pcall(function() return surface.Color end)
        if okColor and surfaceColor then data.surfaceAppearance.color = hex(surfaceColor) end
        local okAlpha, alphaMode = pcall(function() return surface.AlphaMode end)
        if okAlpha and alphaMode then data.surfaceAppearance.alphaMode = tostring(alphaMode) end
    end
    local model = p.Parent
    if model and model:IsA("Model") and model:FindFirstChildOfClass("Humanoid") then
        data.rigType = tostring(model:FindFirstChildOfClass("Humanoid").RigType)
        if not data.meshId or data.meshId == "" then
            local bodyNames = {Torso = "Torso", ["Left Arm"] = "LeftArm", ["Right Arm"] = "RightArm", ["Left Leg"] = "LeftLeg", ["Right Leg"] = "RightLeg", Head = "Head"}
            for _, child in ipairs(model:GetChildren()) do
                if child:IsA("CharacterMesh") and child.BodyPart.Name == bodyNames[p.Name] and child.MeshId ~= 0 then
                    data.meshId = "rbxassetid://" .. tostring(child.MeshId)
                    if child.BaseTextureId ~= 0 then data.textureId = "rbxassetid://" .. tostring(child.BaseTextureId) end
                    break
                end
            end
        end
        local name = p.Name
        local torso = name == "Torso" or name == "UpperTorso" or name == "LowerTorso"
        local arm = name:match("Arm$") ~= nil or name:match("Hand$") ~= nil
        local leg = name:match("Leg$") ~= nil or name:match("Foot$") ~= nil
        if torso or arm or leg then
            local clothing = {}
            local shirt = model:FindFirstChildOfClass("Shirt")
            if shirt and (torso or arm) and shirt.ShirtTemplate ~= "" then
                clothing.shirt = tostring(shirt.ShirtTemplate)
                clothing.shirtColor = hex(shirt.Color3)
            end
            local pants = model:FindFirstChildOfClass("Pants")
            if pants and (torso or leg) and pants.PantsTemplate ~= "" then
                clothing.pants = tostring(pants.PantsTemplate)
                clothing.pantsColor = hex(pants.Color3)
            end
            local graphic = model:FindFirstChildOfClass("ShirtGraphic")
            if graphic and torso and graphic.Graphic ~= "" then
                clothing.graphic = tostring(graphic.Graphic)
                clothing.graphicColor = hex(graphic.Color3)
            end
            if next(clothing) then data.clothing = clothing end
        end
    end
    local lights = {}
    for _, light in ipairs(p:GetDescendants()) do
        if light:IsA("PointLight") or light:IsA("SpotLight") or light:IsA("SurfaceLight") then
            local row = {className = light.ClassName, enabled = light.Enabled, color = hex(light.Color), brightness = light.Brightness, range = light.Range, shadows = light.Shadows}
            if not light:IsA("PointLight") then row.angle = light.Angle; row.face = tostring(light.Face) end
            if light.Parent:IsA("Attachment") then row.position = v3(light.Parent.Position); row.orientation = v3(light.Parent.Orientation) end
            table.insert(lights, row)
        end
    end
    if #lights > 0 then data.lights = lights end
    -- Capture common in-world text attached directly to this part. Layout and
    -- rich text are approximated by the viewer; ScreenGui remains local UI.
    local textElements = {}
    for _, gui in ipairs(p:GetChildren()) do
        if (gui:IsA("SurfaceGui") or gui:IsA("BillboardGui")) and gui.Enabled then
            for _, label in ipairs(gui:GetDescendants()) do
                if (label:IsA("TextLabel") or label:IsA("TextButton")) and label.Visible and label.Text ~= "" and #textElements < 32 then
                    table.insert(textElements, {text = tostring(label.Text):sub(1, 300), font = tostring(label.Font), color3 = hex(label.TextColor3),
                        transparency = label.TextTransparency, kind = gui.ClassName,
                        face = gui:IsA("SurfaceGui") and tostring(gui.Face) or "Front"})
                end
            end
        end
    end
    if #textElements > 0 then data.textElements = textElements end
    local capturedChildren = 0
    local function captureChild(inst, depth)
        if depth > 5 or capturedChildren >= 100 or inst:IsA("BasePart") then return nil end
        capturedChildren += 1
        local node = {name = inst.Name, className = inst.ClassName, children = {}}
        if inst:IsA("Sound") then
            node.properties = {instancePath = pth(inst), soundId = inst.SoundId, volume = inst.Volume, playbackSpeed = inst.PlaybackSpeed,
                looped = inst.Looped, rollOffMinDistance = inst.RollOffMinDistance, rollOffMaxDistance = inst.RollOffMaxDistance,
                rollOffMode = tostring(inst.RollOffMode), timePosition = inst.TimePosition, playing = inst.IsPlaying}
        elseif inst:IsA("Attachment") then node.properties = {position = v3(inst.Position), orientation = v3(inst.Orientation)}
        elseif inst:IsA("SpecialMesh") then node.properties = {meshId = inst.MeshId, textureId = inst.TextureId, meshType = tostring(inst.MeshType), scale = v3(inst.Scale)}
        elseif inst:IsA("TextLabel") or inst:IsA("TextButton") then node.properties = {text = tostring(inst.Text):sub(1, 300), font = tostring(inst.Font), color3 = hex(inst.TextColor3), visible = inst.Visible}
        elseif inst:IsA("Decal") then node.properties = {texture = inst.Texture, transparency = inst.Transparency, face = tostring(inst.Face)} end
        for _, child in ipairs(inst:GetChildren()) do
            local recorded = captureChild(child, depth + 1)
            if recorded then table.insert(node.children, recorded) end
            if capturedChildren >= 100 then break end
        end
        return node
    end
    local childInstances = {}
    for _, child in ipairs(p:GetChildren()) do
        local recorded = captureChild(child, 1)
        if recorded then table.insert(childInstances, recorded) end
        if capturedChildren >= 100 then break end
    end
    if #childInstances > 0 then data.childInstances = childInstances end
    return data
end

