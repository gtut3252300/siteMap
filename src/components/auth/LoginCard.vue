<template>
  <div class="login-overlay">
    <el-card class="login-card">
      <template #header>
        <h2 class="title-header" style="text-align: center; margin: 0">
          新北市都更查詢系統
        </h2>
      </template>

      <div class="login-steps">
        <div class="step-box">
          <el-divider>步驟 1: Google 登入</el-divider>

          <div
            v-if="!user.google.id"
            id="google_btn_wrapper"
            class="center-flex"
          ></div>
          <div v-else class="authenticated-info">
            <el-avatar :src="user.google.picture" />
            <span class="success-text"
              >Google 已驗證: {{ user.google.name }}</span
            >
          </div>
        </div>

        <div class="step-box">
          <el-divider>步驟 2: Facebook 綁定</el-divider>
          <div v-if="!user.facebook.id">
            <el-button
              type="primary"
              size="large"
              @click="handleFBLogin"
              style="width: 100%; background-color: #1877f2"
            >
              <i class="fab fa-facebook-f" style="margin-right: 8px"></i> 綁定
              Facebook
            </el-button>
          </div>
          <div v-else class="authenticated-info">
            <el-avatar :src="user.facebook.picture" />
            <span class="success-text"
              >Facebook 已綁定: {{ user.facebook.name }}</span
            >
          </div>
        </div>

        <el-button
          type="success"
          size="large"
          class="enter-btn"
          color="#4EA476"
          style="color: #fff"
          @click="handleEnter"
        >
          進入查詢地圖
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, onMounted, nextTick } from "vue";
import { ElMessage, ElNotification } from "element-plus";

const GOOGLE_CLIENT_ID =
  "737444360335-03fp8kjs1alt73gi9dnr700ki5j12uhc.apps.googleusercontent.com";
const FB_APP_ID = "1943332376223447";

const emit = defineEmits(["login-success"]);

const user = reactive({
  google: { id: null, name: null, picture: null },
  facebook: { id: null, name: null, picture: null },
});

onMounted(() => {
  loadGoogleSDK();
  loadFacebookSDK();
});

const loadGoogleSDK = () => {
  if (window.google && window.google.accounts) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    });

    const btnWrapper = document.getElementById("google_btn_wrapper");
    if (btnWrapper) {
      window.google.accounts.id.renderButton(btnWrapper, {
        theme: "outline",
        size: "large",
        width: 250,
      });
    }
  } else {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      loadGoogleSDK();
    };
    document.head.appendChild(script);
  }
};

const handleGoogleResponse = (response) => {
  const payload = JSON.parse(
    decodeURIComponent(escape(atob(response.credential.split(".")[1])))
  );
  user.google = {
    id: payload.sub,
    name: payload.name,
    picture: payload.picture,
  };
  ElMessage.success(`Google 登入成功: 歡迎 ${payload.name}`);
};

const loadFacebookSDK = () => {
  if (window.FB) {
    return;
  }
  window.fbAsyncInit = function () {
    window.FB.init({
      appId: FB_APP_ID,
      cookie: true,
      xfbml: true,
      version: "v24.0",
    });
    FB.AppEvents.logPageView();
  };
  (function (d, s, id) {
    var js,
      fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
      return;
    }
    js = d.createElement(s);
    js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  })(document, "script", "facebook-jssdk");
};

const handleFBLogin = () => {
  if (!window.FB) return;
  window.FB.login(
    (response) => {
      if (response.authResponse) {
        window.FB.api("/me", { fields: "name, picture" }, (userInfo) => {
          user.facebook = {
            id: userInfo.id,
            name: userInfo.name,
            picture: userInfo.picture.data.url,
          };
          ElMessage.success(`Facebook 綁定成功: ${userInfo.name}`);
        });
      } else {
        ElMessage.warning("Facebook 登入取消");
      }
    },
    { scope: "public_profile" }
  );
};

const handleEnter = async () => {
  await nextTick();
  if (!user.google.id) {
    ElNotification({
      title: "提示",
      message: "您尚未登入喔",
    });
    return;
  }
  
  // 將使用者資訊傳回父元件
  emit("login-success", {
    google: user.google,
    facebook: user.facebook,
  });
};
</script>

<style lang="scss" scoped>
.login-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #e9f4ee;
  backdrop-filter: blur(5px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 400px;
  max-width: 90%;
  border-radius: 8px;
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
  background: #e9f4ee;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid #e1f3d8;
  .el-avatar {
    --el-avatar-size: 26px;
  }
}

.success-text {
  color: #4ea476;
}

.enter-btn {
  width: 100%;
  margin-top: 20px;
  font-weight: bold;
}

.title-header {
  color: #408560;
  font-weight: 500;
}

:deep {
  .el-divider__text {
    white-space: nowrap;
  }
  .el-card__body {
    padding: 10px;
  }
}
</style>
