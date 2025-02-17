<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { io } from "socket.io-client";
import INVITECODE from "./components/InviteCode.vue";
import TEAMBOX from "./components/TeamBox.vue";
import BUTTON from "./components/Button.vue";
import { notification } from "../assets/js/notificationEvent";
import { playSound, stopSound, stopAllSounds } from "../assets/js/playSound";
import Cookies from "js-cookie";
import { getToken } from "../assets/js/getToken";

const route = useRoute();
const router = useRouter();
const code = ref(route.params.code);
const players = ref([{ name: "null", host: 0 }]);
const isGameStarted = ref(false);
const countdown = ref(-1);
const isHost = ref(false);
const socket = ref(io(`http://${window.location.hostname}:8000`));
const token = getToken();
const canStart = ref(true);
const cookies = Cookies.get("music");
if (!cookies) {
  Cookies.set("music", true);
}

/**
 * Ottiene il codice della stanza dalla API.
 *
 * @returns Un Json con il codice della stanza.
 */
const getRoom = async () => {
  try {
    // Effettua la richiesta API utilizzando il token nell'header di autorizzazione
    const response = await axios.get(
      `http://${window.location.hostname}:8000/api/room/${code.value}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.data === "Logged out successfully") {
      localStorage.removeItem("token");
      return router.push("/");
    }
    if (response.data.length === 0) {
      return router.push("/");
    }
    if (response.data.status === "in_progress") {
      router.push("/game/" + code.value);
    }
    return response.data;
  } catch (error) {
    router.push("/");
    console.error("Error fetching room code:", error);
  }
};

/**
 * Ottiene la lista dei giocatori.
 *
 * @returns Un Json con la lista dei giocatori.
 */
const getPlayers = async () => {

  try {
    const response = await axios.get(
      `http://${window.location.hostname}:8000/api/room/${code.value}/players`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );
    players.value = response.data;
    await getPlayersAvatars();
  } catch (error) {
    console.error("Error fetching players:", error);
  }
};

const getPlayersAvatars = async () => {
  try {
    for (const player of players.value) {
      const response = await axios.get(
        `http://${window.location.hostname}:8000/api/user/${player.user_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      player.avatar = response.data.avatar;
    }
  } catch (error) {
    console.error("Error fetching player avatars:", error);
  }
};

/**
 * Ottiene le informazioni dell'utente in base all'ID del giocatore.
 *
 * @param {string} playerId - L'ID del giocatore di cui ottenere le informazioni.
 * @returns {Promise<Object>} - Una promessa che risolve con le informazioni dell'utente.
 */
const getUser = async (playerId) => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("Authorization token is missing");
    return null;
  }

  try {
    const response = await axios.get(
      `http://${window.location.hostname}:8000/api/user/${playerId}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.username;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

/**
 * Funzione asincrona per uscire dalla stanza.
 */
const leaveRoom = async () => {
  try {
    const response = await axios.delete(
      `http://${window.location.hostname}:8000/api/room/${code.value}/leave`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error leaving room:", error);
  }
};

/**
 * Elimina una stanza.
 * Questa funzione asincrona gestisce la logica per eliminare una stanza.
 */
const deleteRoom = async () => {

  try {
    await axios.delete(
      `http://${window.location.hostname}:8000/api/room/${code.value}/delete`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (error) {
    console.error("Error deleting room:", error);
  }
};

/**
 * Verifica se l'utente è presente nella stanza.
 */
const isUserInRoom = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("Authorization token is missing");
    return false;
  }

  try {
    const response = await axios.get(
      `http://${window.location.hostname}:8000/api/room/${code.value}/player/in_room`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error checking user in room:", error);
    return false;
  }
};

/**
 * Verifica se il giocatore è l'host della stanza.
 */
const isPlayerHost = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("Authorization token is missing");
    return false;
  }

  try {
    const response = await axios.get(
      `http://${window.location.hostname}:8000/api/room/${code.value}/player/is_host`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );
    isHost.value = response.data;
  } catch (error) {
    console.error("Error fetching host:", error);
    return false;
  }
};
/**
 * Avvia il gioco in modo asincrono.
 */
const startGame = async () => {
  if (players.value.length !== 2 && players.value.length !== 4) {
    if (cookies === "true") {
      playSound("wrong");
    }
    notification.send(
      "Devi avere almeno 2 giocatori per iniziare il gioco",
      "danger"
    );
    return;
  }

  try {
    await axios.post(
      `http://${window.location.hostname}:8000/api/room/${code.value}/start`,
      {},
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );
    countdown.value = 3;
    if (cookies === "true") {
      stopSound("waiting");
      playSound("countdown");
    }
    const interval = setInterval(() => {
      countdown.value--;
      if (countdown.value === 0) {
        clearInterval(interval);
        isGameStarted.value = true;
        router.push("/game/" + code.value);
      }
    }, 1000);
    socket.value.emit("startGame", code.value);
  } catch (error) {
    console.error("Error starting game:", error);
  }
};

/**
 * Restituisce il colore del pulsante.
 */
const getButtonColor = () => {
  if (players.value.length === 2 || players.value.length === 4) {
    return "success";
  } else {
    return "danger";
  }
};


const updatePlayerNames = async () => {
  for (const player of players.value) {
    player.name = await getUser(player.user_id);
  }
};

const handleClickStart = () => {
  if (canStart.value) {
    canStart.value = false;
    startGame();
  } else {
    notification.send("This game is starting soon, please wait", "danger");
  }
};

  onMounted(async () => {
    if (!(await isUserInRoom())) {
      return router.push("/");
    }

    if (cookies === "true") {
      playSound("waiting", true);
    }

    await getRoom();
    await getPlayers();
    await updatePlayerNames();
    await isPlayerHost();
    socket.value = io(`http://${window.location.hostname}:8000`);

    socket.value.emit("joinRoom", code.value, players.value[0].name);
    socket.value.on("playerJoined", async (player) => {
      await getPlayers();
      await updatePlayerNames();
    });

    socket.value.on("playerLeft", async (player) => {
      await getPlayers();
      await updatePlayerNames();
    });

    socket.value.on("hostDelete", async () => {
      router.push("/");
    });

    socket.value.on("gameStarted", async () => {
      countdown.value = 3;
      if (cookies === "true") {
        stopSound("waiting");
        playSound("countdown");
      }
      const interval = setInterval(() => {
        countdown.value--;
        if (countdown.value === 0) {
          clearInterval(interval);
          isGameStarted.value = true;
          router.push("/game/" + code.value);
        }
      }, 1000);
    });
  });

  onUnmounted(async () => {
    stopAllSounds();
    // Chiudi la connessione WebSocket quando il componente viene smontato
    if (!isGameStarted.value) {
      await leaveRoom();
    }

    if (players.value.length === 0 && !isGameStarted.value) {
      await deleteRoom();
    }

    if (isPlayerHost() && !isGameStarted.value) {
      socket.value.emit("hostLeft", code.value);
    } else {
      socket.value.emit("leaveRoom", code.value, players.value[0].name);
    }
  });
</script>

<template>
  <section class="room-container">
    <INVITECODE :placeholder="code" />
    <section class="team-list-container">
      <section v-if="players.filter((p) => p?.team === 1).length > 0">
        <h2>Squadra 1</h2>
        <section class="team-container">
          <TEAMBOX v-for="(player, index) in players.filter((p) => p?.team === 1)" :key="index" color="success"
            :avatar="player.avatar" :host="player.host">{{ player?.name }}</TEAMBOX>
        </section>
      </section>
      <section v-if="players.filter((p) => p?.team === 2).length > 0">
        <h2>Squadra 2</h2>
        <section class="team-container">
          <TEAMBOX v-for="(player, index) in players.filter((p) => p?.team === 2)" :key="index" color="success"
            :avatar="player.avatar" :host="player.host">{{ player?.name }}</TEAMBOX>
        </section>
      </section>
    </section>
  </section>
  <footer>
    <BUTTON v-if="isHost" @click="handleClickStart" :color="getButtonColor()">START GAME</BUTTON>
  </footer>
  <div v-if="countdown >= 0" class="countdown-overlay">
    <div class="countdown-text">
      {{ countdown }}
    </div>
  </div>
</template>

<style scoped>
.countdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.countdown-text {
  font-size: 12rem;
  color: white;
  text-align: center;
}

h2 {
  color: var(--primary-color);
  margin-bottom: 1vh;
}

.room-container {
  display: flex;
  width: 80vw;
  flex-direction: column;
  height: 60vh;
  justify-content: space-between;
}

section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.team-list-container {
  padding: 2vh 0;
  gap: 2vh;
}

.team-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.cm-switch {
  display: flex;
  margin-left: auto;
  margin-top: 3vh;
}
</style>
