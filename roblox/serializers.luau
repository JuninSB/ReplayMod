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
        data.characterHealth = p.Parent:FindFirstChildOfClass("Humanoid").Health
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
    end
    local special = p:FindFirstChildOfClass("SpecialMesh")
    if special then
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
    return data
end

