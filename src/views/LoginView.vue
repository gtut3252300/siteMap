<template>
  <LoginCard @login-success="handleLoginSuccess" />
</template>

<script setup>
import { useRouter } from "vue-router";
import { ElNotification } from "element-plus";
import LoginCard from "@/components/auth/LoginCard.vue";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const handleLoginSuccess = (userInfo) => {
  // 儲存使用者資訊到 Pinia Store
  if(userInfo){
  authStore.setUser(userInfo);
  router.push({ name: "map" });

    // 顯示成功通知
  ElNotification({
    title: "登入成功",
    message: "即將進入查詢地圖...",
    type: "success",
  });
  }

  

  

};
</script>

<style lang="scss" scoped>
</style>
