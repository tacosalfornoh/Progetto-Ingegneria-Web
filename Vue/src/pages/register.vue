<script setup>
import { notification } from "@/assets/js/notificationEvent.js";
import INPUT from "./components/Input.vue";
import BUTTON from "@/pages/components/Button.vue";
import axios from "axios";
import { ref } from "vue";
import { useRouter } from 'vue-router';
import { playSound } from "../assets/js/playSound";
import Cookies from 'js-cookie';

const username = ref('');
const email = ref('');
const password = ref('');
const c_password = ref('');

const music = Cookies.get('music');
if (!music) {
  Cookies.set('music', true);
}

const handleSignUp = async () => {
  try {
    const response = await axios.post(`http://${window.location.hostname}:8000/api/auth/register`, {
      username: username.value,
      email: email.value,
      password: password.value
    });
    if (music) {
      playSound("success");
    }
    notification.send('Registration successful', 'success');
  } catch (error) {
    if (music) {
      playSound("wrong");
    }
    notification.send(error.response.data, 'danger');
  }
};
</script>

<template>
  <section class="signup-container">
    <img src="https://i.imgur.com/v9LaPxu.png" alt="Briscola logo" />
    <div>
      <INPUT v-model="username" placeholder="Username" type="username" />
      <INPUT v-model="email" placeholder="Email" type="email" />
      <INPUT v-model="password" placeholder="Password" type="password" />
      <INPUT v-model="c_password" placeholder="Confirm Password" type="password" />
    </div>
    <BUTTON @click="handleSignUp">SIGN UP</BUTTON>
    <p>
      <router-link to="/sign-in">Sign In</router-link>
      if you haven't already.
    </p>
  </section>
</template>

<style scoped>
.signup-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 90vh;
  gap: 20px;
}

img {
  width: 250px;
  height: auto;
}

div {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
</style>