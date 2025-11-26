<template>
  <div class="app-container">
    <div v-if="!openMap"  class="login-overlay">
      <el-card class="login-card">
        <template #header>
          <h2 style="text-align: center; margin: 0">新北市都更查詢系統</h2>
        </template>

        <div class="login-steps">
          <div class="step-box">
            <el-divider>步驟 1: Google 登入</el-divider>

            <div v-if="!user.google.id" id="google_btn_wrapper" class="center-flex"></div>
            <div v-else class="authenticated-info">
              <el-avatar :src="user.google.picture" />
              <span class="success-text">Google 已驗證: {{ user.google.name }}</span>
            </div>
          </div>

          <div class="step-box">
            <el-divider>步驟 2: Facebook 綁定</el-divider>
            <div v-if="!user.facebook.id">
              <el-button
                type="primary"
                size="large"
                :disabled="!user.google.id"
                @click="handleFBLogin"
                style="width: 100%; background-color: #1877f2"
              >
                <i class="fab fa-facebook-f" style="margin-right: 8px"></i> 綁定 Facebook
              </el-button>
              <!-- <el-button 
                type="primary" 
                size="large" 
            
                @click="handleFBLogin"
                style="width: 100%; background-color: #1877F2;">
                <i class="fab fa-facebook-f" style="margin-right: 8px;"></i> 綁定 Facebook
              </el-button> -->
            </div>
            <div v-else class="authenticated-info">
              <el-avatar :src="user.facebook.picture" />
              <span class="success-text">Facebook 已綁定: {{ user.facebook.name }}</span>
            </div>
          </div>

           <el-button type="success" size="large" class="enter-btn" 
           :disabled="!isFullyAuthenticated"
           @click="initSystem">
          進入查詢地圖
        </el-button>
        </div>
      </el-card>
    </div>

    <el-container v-else class="main-layout">
      <el-aside width="350px" class="sidebar">
       
        <h2 class="title">{{ title }}</h2>
        <div style="padding: 10px">
          <el-input
            v-model="searchText"
            placeholder="搜尋地址（例如：新北市板橋區府中路）"
            clearable
            @keyup.enter="searchAddress"
          >
            <template #append>
              <el-button @click="searchAddress" type="primary">查詢</el-button>
            </template>
          </el-input>
        </div>
        <div class="sidebar-header">
          <h3>附近的都更地點</h3>
          <small
            >目前位置: {{ userLocation.lat?.toFixed(4) }}, {{ userLocation.lng?.toFixed(4) }}</small
          >
        </div>

        <el-scrollbar>
          <div v-loading="loading" class="list-container">
            <el-empty v-if="!loading && renewalList.length === 0" description="附近無資料" />

            <el-card
              v-for="(item, index) in renewalList"
              :key="index"
              class="location-card"
              shadow="hover"
              @click="flyToLocation(item)"
            >
              <div class="card-content">
                <img v-if="item.image" :src="item.image" class="location-img" />
                <div class="location-info">
                  <h4>{{ item.stop_name }}</h4>
                  <div class="km__style">{{ item.distance }} km</div>
             
                </div>
              </div>
            </el-card>
          </div>
        </el-scrollbar>
      </el-aside>

      <el-main class="map-wrapper">
        <div id="map"></div>
      </el-main>
      
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import L from 'leaflet'
import { ElMessage, ElNotification } from 'element-plus'
import axios from 'axios'
import iconUrl from '@/assets/marker-icon.png'
import iconRetinaUrl from '@/assets/marker-icon-2x.png'
import shadowUrl from '@/assets/marker-shadow.png'



const GOOGLE_CLIENT_ID = '737444360335-03fp8kjs1alt73gi9dnr700ki5j12uhc.apps.googleusercontent.com'
const FB_APP_ID = '1943332376223447'

// ---------------------------------------------------------
// 狀態管理
// ---------------------------------------------------------
const user = reactive({
  google: { id: null, name: null, picture: null },
  facebook: { id: null, name: null, picture: null },
})
const userLocation = reactive({ lat: null, lng: null })
const renewalList = ref([])
const loading = ref(false)
const map = ref(null)
const markers = ref([]) // 儲存地圖上的標記以便管理

const isFullyAuthenticated = computed(() => !!user.google.id && !!user.facebook.id)
const openMap = ref(false);

onMounted(() => {
  loadGoogleSDK()
  loadFacebookSDK()

})
   L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
})
const loadGoogleSDK = () => {
  // 檢查是否已載入 google script
  if (window.google && window.google.accounts) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    })

    // 確保 DOM 元素存在再 render
    const btnWrapper = document.getElementById('google_btn_wrapper')
    if (btnWrapper) {
      window.google.accounts.id.renderButton(btnWrapper, {
        theme: 'outline',
        size: 'large',
        width: 250,
      })
    }
  } else {

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      // 載入完成後再遞迴呼叫一次自己
      loadGoogleSDK()
    }
    document.head.appendChild(script)
  }
}

const handleGoogleResponse = (response) => {
  const payload = JSON.parse(decodeURIComponent(escape(atob(response.credential.split('.')[1]))))
  user.google = {
    id: payload.sub,
    name: payload.name,
    picture: payload.picture,
  }
  ElMessage.success(`Google 登入成功: 歡迎 ${payload.name}`)
}

const loadFacebookSDK = () => {
  if (window.FB) {
    return
  }
  window.fbAsyncInit = function () {
    window.FB.init({
      appId: FB_APP_ID,
      cookie: true,
      xfbml: true,
      version: 'v24.0',
    })
    FB.AppEvents.logPageView()
  }
  ;(function (d, s, id) {
    var js,
      fjs = d.getElementsByTagName(s)[0]
    if (d.getElementById(id)) {
      return
    }
    js = d.createElement(s)
    js.id = id
    js.src = 'https://connect.facebook.net/en_US/sdk.js'
    fjs.parentNode.insertBefore(js, fjs)
  })(document, 'script', 'facebook-jssdk')

}

const handleFBLogin = () => {
  if (!window.FB) return
  window.FB.login(
    (response) => {
      console.log(response, 'FB')
      if (response.authResponse) {
        window.FB.api('/me', { fields: 'name, picture' }, (userInfo) => {
          user.facebook = {
            id: userInfo.id,
            name: userInfo.name,
            picture: userInfo.picture.data.url,
          }
          ElMessage.success(`Facebook 綁定成功: ${userInfo.name}`)
        })
      } else {
        ElMessage.warning('Facebook 登入取消')
      }
    },
    { scope: 'public_profile' },
  )
}

const title = ref('')
// 系統初始化 (進入地圖)
const initSystem = async () => {
  await nextTick()

  initMap()
  openMap.value=true
}

const initMap = () => {
  // 取得使用者位置
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation.lat = position.coords.latitude
        userLocation.lng = position.coords.longitude
        renderMap([userLocation.lat, userLocation.lng])
      },
      (err) => {
        ElMessage.error('無法取得定位，預設為新北市')
        // 預設座標 (新北市政府附近)
        userLocation.lat = 25.012
        userLocation.lng = 121.465
        renderMap([25.012, 121.465])
      },
    )
  }
}

const renderMap = (center) => {
  // 防止重複初始化的防呆
  if (map.value) {
    map.value.remove()
  }

  // 確保 id="map" 真的有寬高
  const mapDiv = document.getElementById('map')
  if (!mapDiv) {
    console.error('找不到地圖容器 #map')
    return
  }

  map.value = L.map('map').setView(center, 14)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
  }).addTo(map.value)

  // 建立 User Marker 與自訂雙頭像 Tooltip
  const tooltipHTML = `
    <div class="tooltipHTML">
      <div class="tooltipHTML__img">
        <img src="${user.google.picture}">
        <img src="${user.facebook.picture}" style="border: 2px solid #1877F2;     margin-left: -13px;">
      </div>
      <span style="font-weight: bold; font-size: 14px;">我底加啦!</span>
    </div>
  `

  L.marker(center)
    .addTo(map.value)
    .bindTooltip(tooltipHTML, {
      permanent: true,
      direction: 'top',
      className: 'user-location-tooltip', // 用於去除預設邊框樣式
    })
    .openTooltip()

  // 呼叫 API
  fetchPolygon()
  fetchNearbySpots()
}


// 取得 Polygon (土城範例)

const fetchPolygon = async () => {
  try {
    const res = await axios.get(
      'https://enterprise.oakmega.ai/api/v1/server/xinbei/geolocation-json',
      { params: { directory: 'tucheng.json' } }
    )

    const geoData = res.data.result
    if (geoData.name) title.value = geoData.name

    const geoJsonLayer = L.geoJSON(geoData, {
      // 統一樣式：全部藍色框選
      style: (feature) => ({
        color: '#0066ff',
        weight: 3,
        opacity: 1,
        fillColor: '#0066ff',
        fillOpacity: 0.1
      }),
      
      // 互動視窗：針對每一個 feature 綁定 Popup
      onEachFeature: (feature, layer) => {
        // 檢查 properties 是否存在
        if (feature.properties) {
          const props = feature.properties;

          const popupContent = `
            <div style="font-size:14px;">
              <b>分區：</b> ${props['分區'] || '未知'}<br>
              <b>備註：</b> ${props['TxtMemo'] || '無'}<br>
              <b>面積：</b> ${props['SHAPE_Area'] ? props['SHAPE_Area'].toFixed(2) : 0}
            </div>
          `;
          layer.bindPopup(popupContent);
        }
      }
    }).addTo(map.value)

    // 縮放至包含「所有」Polygon 的範圍
    const bounds = geoJsonLayer.getBounds();
    if (bounds.isValid()) {
        map.value.fitBounds(bounds);
    }

    ElNotification({
      title: 'Polygon 載入成功',
      message: `已載入 ${geoData.features.length} 筆都更資料`,
      type: 'success',
    })

  } catch (error) {
    console.error('Fetch Polygon Error:', error)
    ElMessage.error('Polygon 資料載入失敗')
  }
}
// 取得附近都更點
const fetchNearbySpots = async () => {
  loading.value = true

  if (!userLocation.lat || !userLocation.lng) {
    console.warn('無效座標，停止呼叫 API', userLocation)
    loading.value = false
    return
  }

  try {
    const res = await axios.post(
      'https://enterprise.oakmega.ai/api/v1/server/xinbei/calc-distance',
      {
        lat: userLocation.lat,
        lng: userLocation.lng,
      },
    )

    console.log('API 回傳：', res.data)

    const data = res.data?.result || res.data || []

    renewalList.value = data

    data.forEach((spot) => {
      const spotLat = spot.lat || spot.latitude
      const spotLng = spot.lng || spot.longitude

      if (spotLat && spotLng) {
        const marker = L.marker([spotLat, spotLng]).addTo(map.value).bindPopup(`
            <b>${spot.stop_name}</b><br>
            距離: ${spot.distance} m<br>
            ${spot.image ? `<img  src="${spot.image}" style="width:100%; margin-top:5px; border-radius:4px;">` : ""}
            
          `)

        spot.markerInstance = marker
      }
    })
  } catch (error) {
    console.error('API ERROR:', error)
    console.error('RESPONSE:', error.response)
    ElMessage.error('附近地點載入失敗')
  } finally {
    loading.value = false
  }
}


const flyToLocation = (item) => {
  if (item.markerInstance) {
    //flyTo 設定地圖視圖（地理中心和縮放等級），實現平滑的平移縮放動畫。
    //latlng, <Number> zoom?
    map.value.flyTo(item.markerInstance.getLatLng(), 16)
    item.markerInstance.openPopup()
  } else {
    ElMessage.warning('該地點無座標資訊')
  }
}

const searchText = ref('')
const searchAddress = async () => {
  if (!searchText.value) {
    ElMessage.warning('請輸入地址')
    return
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText.value)}`

    const res = await axios.get(url)

    if (!res.data || res.data.length === 0) {
      ElMessage.error('找不到該地址')
      return
    }

    const location = res.data[0]
    const lat = parseFloat(location.lat)
    const lng = parseFloat(location.lon)

    // 更新使用者位置
    userLocation.lat = lat
    userLocation.lng = lng

    // 移動地圖
    map.value.flyTo([lat, lng], 16)

    // 加 Marker
    L.marker([lat, lng]).addTo(map.value).bindPopup(`搜尋結果：${searchText.value}`).openPopup()

    // 重新抓附近地點
    fetchNearbySpots()
  } catch (e) {
    console.error(e)
    ElMessage.error('地址搜尋失敗，請稍後再試')
  }
}
</script>

<style lang="scss" scoped>
/* 全域樣式調整 */
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family:
    'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial,
    sans-serif;
}

.app-container {
  height: 100vh;
  width: 100vw;
  position: relative;
}
.title{
  font-size: 18px;
  font-weight: bolder;
  color:#181818;
  padding: 5px 5px 0;
  text-align: center;
}
/* 登入遮罩 */
.login-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(240, 242, 245, 0.9);
  backdrop-filter: blur(5px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 400px;
  max-width: 90%;
}

.step-box {
  margin-bottom: 20px;
  text-align: center;
}

.center-flex {
  display: flex;
  justify-content: center;
}

.authenticated-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: #f0f9eb;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e1f3d8;
}

.success-text {
  color: #67c23a;
  font-weight: bold;
}

.enter-btn {
  width: 100%;
  margin-top: 20px;
  font-weight: bold;
}

/* 主介面 */
.main-layout {
  height: 100%;
}

.sidebar {
  background: #fff;
  border-right: 1px solid #dcdfe6;
  display: flex;
  flex-direction: column;
  z-index: 500; /* 確保在 Leaflet 之上 */
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  @media (max-width:575px) {
       height: 50%;
        top: 50%;
        position: absolute;
        left: 0;
        width: 100%;
  }
}

.sidebar-header {
  padding: 15px;
  background: #409eff;
  color: white;
  @media (max-width:575px) {
        padding: 5px 15px;
  }
}

.sidebar-header h3 {
  margin: 0 0 5px 0;
    @media (max-width:575px) {
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
  border-radius: 4px;
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

.map-wrapper {
  height: 100%;
  width: 100%;
  padding: 0 !important;
  position: relative;
  @media (max-width:575px) {
    height: 50%;
  }
}

#map {
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* Leaflet 自訂 Tooltip 樣式 */
.user-location-tooltip {
  background: transparent;
  border: none;
  box-shadow: none;
}
.user-location-tooltip::before {
  display: none; /* 隱藏小箭頭 */
}

::v-deep {
  .el-divider__text{
    white-space: nowrap;
  }
  .el-card__body {

    padding: 10px;
}
  .tooltipHTML {
    background: #ffffff;
    border-radius: 5px;
    padding: 5px 10px 5px 20px;
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
      width: 32px;
      height: 32px;
      border-radius: 50%;
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
}
</style>

