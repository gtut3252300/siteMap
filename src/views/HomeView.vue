<template>
  <div class="app-container">
    <el-container class="main-layout">
      <div class="sidebar">
        <h2 class="title">{{ title }}</h2>
        <div class="search">
          <el-input
            v-model="searchText"
            placeholder="搜尋地址（例如：新北市板橋區府中路）"
            clearable
            @keyup.enter="searchAddress"
          >
            <template #append>
              <Search />
            </template>
          </el-input>
        </div>
        <div class="sidebar-header">
          <h3>附近的都更地點</h3>
          <small
            ><el-icon><LocationFilled /></el-icon> 目前位置:
            {{ userLocation.lat?.toFixed(4) }},
            {{ userLocation.lng?.toFixed(4) }}</small
          >
        </div>

        <el-scrollbar>
          <div v-loading="loading" class="list-container">
            <el-empty
              v-if="!loading && renewalList.length === 0"
              description="附近無資料"
            />

            <el-card
              v-for="(item, index) in renewalList"
              :key="index"
              :class="['location-card', { active: colorStyle(index) }]"
              shadow="hover"
              @click="flyToLocation(item, index)"
            >
              <div class="card-content">
                <img v-if="item.image" :src="item.image" class="location-img" />
                <div class="location-info">
                  <h4>{{ item.stop_name }}</h4>
                  <div class="km__style">
                    {{ item.distance }} <span class="text-unit">km</span>
                  </div>
                </div>
              </div>
            </el-card>
          </div>
        </el-scrollbar>
      </div>

      <el-main class="map-wrapper">
        <div id="map"></div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from "vue";
import L from "leaflet";
import { ElMessage, ElNotification } from "element-plus";
import axios from "axios";
import { LocationFilled } from "@element-plus/icons-vue";
import iconUrl from "@/assets/Vector-icon.png?url";
import iconRetinaUrl from "@/assets/Vector-icon-2x.png?url";
import shadowUrl from "@/assets/Vector-shadow.png?url";
import Search from "@/assets/search.svg?component";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const user = authStore.user;

const userLocation = reactive({ lat: null, lng: null });
const renewalList = ref([]);
const loading = ref(false);
const map = ref(null);
const title = ref("");
const activeIndex = ref(null);
const searchText = ref("");

const CustomIcon = L.Icon.extend({
  options: {
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  },
});

const defaultMarkerIcon = new CustomIcon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
});

onMounted(() => {
  initSystem();
});

const initSystem = async () => {
  await nextTick();
  initMap();
};

const initMap = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation.lat = position.coords.latitude;
        userLocation.lng = position.coords.longitude;
        renderMap([userLocation.lat, userLocation.lng]);
      },
      (err) => {
        userLocation.lat = 25.012;
        userLocation.lng = 121.465;
        renderMap([25.012, 121.465]);
      }
    );
  }
};

const renderMap = (center) => {
  if (map.value) {
    map.value.remove();
  }

  const mapDiv = document.getElementById("map");
  if (!mapDiv) {
    console.error("找不到地圖容器 #map");
    return;
  }

  map.value = L.map("map").setView(center, 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map.value);

  const tooltipHTML = `
  <div class="tooltipHTML">
    ${
      (user.google && user.google.picture) ||
      (user.facebook && user.facebook.picture)
        ? `
          <div class="tooltipHTML__img">
            ${user.google && user.google.picture ? `<img src="${user.google.picture}">` : ""}
            ${user.facebook && user.facebook.picture ? `<img src="${user.facebook.picture}" style="margin-left: -13px">` : ""}
          </div>
        `
        : ""
    }
    <span style="font-weight: bold; font-size: 14px;">我底加啦!</span>
  </div>
`;

  L.marker(center, {
    icon: defaultMarkerIcon,
  })
    .addTo(map.value)
    .bindTooltip(tooltipHTML, {
      permanent: true,
      direction: "top",
      className: "user-location-tooltip",
    })
    .openTooltip();

  fetchPolygon();
  fetchNearbySpots();
};

const fetchPolygon = async () => {
  try {
    const res = await axios.get(
      "https://enterprise.oakmega.ai/api/v1/server/xinbei/geolocation-json",
      { params: { directory: "tucheng.json" } }
    );

    const geoData = res.data.result;
    if (geoData.name) title.value = geoData.name;

    const geoJsonLayer = L.geoJSON(geoData, {
      style: (feature) => ({
        color: "#0066ff",
        weight: 3,
        opacity: 1,
        fillColor: "#0066ff",
        fillOpacity: 0.1,
      }),

      onEachFeature: (feature, layer) => {
        if (feature.properties) {
          const props = feature.properties;

          const popupContent = `
            <div style="font-size:14px;">
              <b>分區：</b> ${props["分區"] || "未知"}<br>
              <b>備註：</b> ${props["TxtMemo"] || "無"}<br>
              <b>面積：</b> ${props["SHAPE_Area"] ? props["SHAPE_Area"].toFixed(2) : 0}
            </div>
          `;
          layer.bindPopup(popupContent);
        }
      },
    }).addTo(map.value);

    const bounds = geoJsonLayer.getBounds();
    if (bounds.isValid()) {
      map.value.fitBounds(bounds);
    }

    ElNotification({
      title: "Polygon 載入成功",
      message: `已載入 ${geoData.features.length} 筆都更資料`,
      type: "success",
    });
  } catch (error) {
    console.error("Fetch Polygon Error:", error);
    ElMessage.error("Polygon 資料載入失敗");
  }
};

const fetchNearbySpots = async () => {
  loading.value = true;

  if (!userLocation.lat || !userLocation.lng) {
    console.warn("無效座標，停止呼叫 API", userLocation);
    loading.value = false;
    return;
  }

  try {
    const res = await axios.post(
      "https://enterprise.oakmega.ai/api/v1/server/xinbei/calc-distance",
      {
        lat: userLocation.lat,
        lng: userLocation.lng,
      }
    );

    const data = res.data?.result || res.data || [];

    renewalList.value = data;

    data.forEach((spot) => {
      const spotLat = spot.lat || spot.latitude;
      const spotLng = spot.lng || spot.longitude;

      if (spotLat && spotLng) {
        const marker = L.marker([spotLat, spotLng], {
          icon: defaultMarkerIcon,
        }).addTo(map.value).bindPopup(`<b>${spot.stop_name}</b><br>
        距離: ${spot.distance} m<br>
        ${spot.image ? `<img src="${spot.image}" style="width:100%; margin-top:5px; border-radius:4px;">` : ""}`);

        spot.markerInstance = marker;
      }
    });
  } catch (error) {
    console.error("API ERROR:", error);
    ElMessage.error("附近地點載入失敗");
  } finally {
    loading.value = false;
  }
};

const flyToLocation = (item, index) => {
  if (item.markerInstance) {
    activeIndex.value = index;
    map.value.flyTo(item.markerInstance.getLatLng(), 16);
    item.markerInstance.openPopup();
  } else {
    ElMessage.warning("該地點無座標資訊");
  }
};

const searchAddress = async () => {
  if (!searchText.value) {
    ElMessage.warning("請輸入地址");
    return;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText.value)}`;

    const res = await axios.get(url);

    if (!res.data || res.data.length === 0) {
      ElMessage.error("找不到該地址");
      return;
    }

    const location = res.data[0];
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lon);

    userLocation.lat = lat;
    userLocation.lng = lng;

    map.value.flyTo([lat, lng], 16);

    L.marker([lat, lng])
      .addTo(map.value)
      .bindPopup(`搜尋結果：${searchText.value}`)
      .openPopup();

    fetchNearbySpots();
  } catch (e) {
    console.error(e);
    ElMessage.error("地址搜尋失敗，請稍後再試");
  }
};

function colorStyle(index) {
  return index === activeIndex.value;
}
</script>

<style lang="scss" scoped>
:root {
  --el-text-color-primary: #767676;
  --el-text-color-placeholder: #408560;
  --el-color-success: #408560;
}

.el-input {
  --el-border-radius-base: 8px;
  --el-input-bg-color: #e9f4ee;
}

.text-unit {
  color: #767676;
  font-size: 18px;
}

html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: "Noto Sans TC", sans-serif;
}

.app-container {
  height: 100vh;
  width: 100vw;
  position: relative;
}

.title {
  font-size: 18px;
  font-weight: bolder;
  color: #ffffff;
  padding: 0.4rem 0;
  text-align: center;
  background: #88c6a5;
}

.search {
  background: #72af8f;
  color: #408560;
  padding: 1rem 1rem;
  svg {
    width: 1.2rem;
    height: 1.2rem;
  }
  :deep(.el-input-group__append) {
    padding: 0 13px;
    background-color: #e9f4ef;
    box-shadow: none;
  }
  :deep(.el-input__wrapper) {
    box-shadow: none;
  }
}

.main-layout {
  height: 100%;
}

.sidebar {
  background: #fff;
  border-right: 1px solid #dcdfe6;
  display: flex;
  flex-direction: column;
  z-index: 500;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 1rem;
  left: 1rem;
  height: 95%;
  border-radius: var(--el-border-radius-base);
  overflow: hidden;
  width: 350px;
  @media (max-width: 575px) {
    height: 50%;
    top: 50%;
    position: absolute;
    left: 0;
    width: 100%;
  }
}

.sidebar-header {
  padding: 0.4rem 1rem;
  background: #444444;
  color: white;
  @media (max-width: 575px) {
    padding: 5px 15px;
  }
}

.sidebar-header h3 {
  margin: 0 0 5px 0;
  @media (max-width: 575px) {
    margin: 0;
  }
}

.list-container {
  padding: 10px;
}

.location-card {
  margin-bottom: 10px;
  cursor: pointer;
  transition: transform 0.2s;
  &.active {
    border: solid #408660 thin;
    box-shadow: 0 0 5px #88c7a5;
    background: rgb(136 199 165 / 13%);
  }
}

.location-card:hover {
  transform: translateY(-2px);
}

.card-content {
  display: flex;
  gap: 10px;
}

.location-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: var(--el-border-radius-base);
}

.location-info {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-weight: bolder;
  align-items: center;
}

.location-info h4 {
  margin: 0;
  font-size: 20px;
}

:deep(.leaflet-tooltip) {
  padding: 6px 10px;
  border-radius: var(--el-border-radius-base);
  color: var(--el-text-color-primary);
  filter: drop-shadow(2px 4px 6px rgba(131, 86, 37, 0.66));
}

:deep(.leaflet-pane.leaflet-overlay-pane path) {
  stroke: #36bb74;
  fill: #28b369;
}

:deep(.leaflet-left .leaflet-control) {
  margin-left: 376px;
  @media (max-width: 575px) {
    margin-left: 10px;
  }
}

:deep(.leaflet-bar a) {
  background-color: #fff;
  border-bottom: 1px solid #ccc;
  width: 26px;
  height: 26px;
  line-height: 26px;
  display: block;
  text-align: center;
  text-decoration: none;
  color: #397755;
}

.map-wrapper {
  height: 100%;
  width: 100%;
  padding: 0 !important;
  position: relative;
  @media (max-width: 575px) {
    height: 50%;
  }
}

#map {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.user-location-tooltip {
  background: transparent;
  border: none;
  box-shadow: none;
}

.user-location-tooltip::before {
  display: none;
}

::v-deep {
  .el-divider__text {
    white-space: nowrap;
  }
  .el-card__body {
    padding: 10px;
  }
  .tooltipHTML {
    padding: 0;
    display: flex;
    align-items: center;
    gap: 9px;
    justify-content: center;
  }
  .tooltipHTML__img {
    display: flex;
    gap: 4px;
    align-items: center;
    width: auto;
    img {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: solid #de9848 3px;
      box-shadow: 2px 2px 9px rgb(131 86 37 / 66%);
      background: #fff;
      padding: 3px;
    }
  }
}

.el-tag--large {
  --el-tag-font-size: 16px;
}

.km__style {
  font-size: 26px;
  font-weight: 500;
  color: #000;
  line-height: 1;
}

.el-button {
  border-radius: var(--el-border-radius-base);
}
</style>
