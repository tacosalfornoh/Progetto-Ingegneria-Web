<script setup>
import { notification } from "@/assets/js/notificationEvent.js";
</script>

<script>
export default {
  name: "TeamBox",
  props: {
    color: {
      type: String,
    },
    host: {
      type: Boolean,
      default: false,
    }
  }
}
</script>

<template>
  <button :color="color">
    <img src="@/assets/img/avatars/Avatar-0.svg" alt="Avatar Profile"/>
    <slot></slot>
    <i v-if="host" class="cm-crown"></i>
  </button>
</template>

<style scoped>
img {
  width: 35px;
  height: auto;
}

button {
  padding: 15px;
  border: 0 solid;
  width: 60vw;
  font-size: 1.5rem;
  color: var(--secondary-color);
  cursor: pointer;
  box-shadow: 0 4px 4px rgb(0 0 0 / 25%);
  display: flex;
  gap: 10px;
  align-items: center;
}

button:first-of-type {
  border-top-left-radius: 15px;
  border-top-right-radius: 15px;
}

button:last-of-type {
  border-bottom-left-radius: 15px;
  border-bottom-right-radius: 15px;
}

button:only-of-type {
  border-radius: 15px;
}

button[color="success"] {
  background-color: var(--success-color);
}

button[color="danger"] {
  background-color: var(--danger-color);
}

</style>