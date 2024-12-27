import { Request, Response } from "express";
import { connect } from "../utils/database";
import { generateCode, isCodeUnique } from "../utils/codeRoom";
import { getUserIdFromToken } from "../utils/getIdByToken";
import { debugPrint } from "../utils/debugPrint";
import { generateDeck } from "../utils/generateDeck";

/**
 * Recupera tutte le stanze dal database e le invia come risposta JSON.
 *
 * @returns Una promessa che risolve inviando i dati delle stanze come risposta JSON.
 *
 * @throws Invia un codice di stato 500 se si verifica un errore durante la query al database.
 *
 * @example "GET: /api/rooms"
 */
export const getRooms = async (req: Request, res: Response) => {
  try {
    const connection = await connect();
    const [rows]: any = await connection.execute("SELECT * FROM rooms");
    debugPrint("Fetched all rooms from the database");
    debugPrint("Sending rooms data as JSON response");
    res.json(rows);
  } catch (error) {
    debugPrint("Error occurred while fetching rooms");
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Recupera una stanza dal database in base all'ID fornito nei parametri della richiesta.
 *
 * @param req - L'oggetto della richiesta HTTP, contenente i parametri della richiesta.
 * @param res - L'oggetto della risposta HTTP, utilizzato per inviare la risposta al client.
 *
 * @returns Restituisce i dettagli della stanza come JSON se trovata, altrimenti restituisce un errore 500.
 *
 * @example "GET: /api/rooms/1"
 */
export const getRoom = async (req: Request, res: Response) => {
  const { code } = req.params;
  try {
    const connection = await connect();
    const [rows]: any = await connection.execute(
      "SELECT * FROM rooms WHERE code = ?",
      [code]
    );
    debugPrint(`Fetched room with ID: ${code}`);
    debugPrint("Sending room data as JSON response");
    res.json(rows[0]);
  } catch (error) {
    debugPrint(`Error occurred while fetching room with ID: ${code}`);
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Ottiene i giocatori di una stanza specifica.
 *
 * @returns Una lista di giocatori presenti nella stanza specificata.
 *
 * @throws Restituisce un errore 500 se si verifica un problema durante l'esecuzione della query.
 *
 * @example "GET: /api/rooms/1/players"
 */
export const getRoomPlayers = async (req: Request, res: Response) => {
  const { code } = req.params;
  try {
    const connection = await connect();
    const [rows]: any = await connection.execute(
      "SELECT * FROM players WHERE room_code = ?",
      [code]
    );
    debugPrint(`Fetched players for room with CODE: ${code}`);
    debugPrint("Sending players data as JSON response");
    res.json(rows);
  } catch (error) {
    debugPrint(
      `Error occurred while fetching players for room with CODE: ${code}`
    );
    res.status(500).send("An error occurred");
  }
};

/**
 * Ottiene i dati del giocatore in gioco.
 *
 * @param req - La richiesta HTTP.
 * @param res - La risposta HTTP.
 * @returns Una risposta JSON contenente i dati del giocatore o un messaggio di errore.
 *
 * Questo metodo estrae il token di autorizzazione dall'intestazione della richiesta,
 * verifica la validità del token e recupera l'ID del giocatore. Successivamente,
 * esegue una query al database per ottenere i dati del giocatore associato al codice
 * della stanza e all'ID del giocatore. Se si verifica un errore durante il processo,
 * viene restituito un messaggio di errore.
 */
export const getPlayerInRoom = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    debugPrint("Authorization token is missing");
    return res.status(401).send("Authorization token is missing");
  }

  const user_id = getUserIdFromToken(token);
  if (!user_id) {
    debugPrint("Invalid or expired token");
    return res.status(401).send("Invalid or expired token");
  }

  const { code } = req.params;

  try {
    const connection = await connect();
    const [rows]: any = await connection.execute(
      "SELECT * FROM players WHERE room_code = ? AND user_id = ?",
      [code, user_id]
    );
    debugPrint(
      `Fetched player with ID: ${user_id} for room with CODE: ${code}`
    );
    debugPrint("Sending player in-game status as JSON response");
    res.json(rows.length > 0);
  } catch (error) {
    debugPrint(
      `Error occurred while fetching player with ID: ${user_id} for room with CODE: ${code}`
    );
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Controlla se il giocatore è l'host della stanza.
 *
 * @returns Una risposta JSON che indica se il giocatore è l'host della stanza.
 *
 * Questo metodo estrae il token di autorizzazione dall'intestazione della richiesta,
 * verifica la validità del token e ottiene l'ID utente associato. Successivamente,
 * esegue una query al database per verificare se l'utente è l'host della stanza
 * specificata dal codice della stanza nei parametri della richiesta.
 *
 * Se il token di autorizzazione è mancante o non valido, viene restituito un errore 401.
 * In caso di errore durante l'esecuzione della query, viene restituito un errore 500.
 */
export const getPlayerIsHost = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    debugPrint("Authorization token is missing");
    return res.status(401).send("Authorization token is missing");
  }

  const user_id = getUserIdFromToken(token);
  if (!user_id) {
    debugPrint("Invalid or expired token");
    return res.status(401).send("Invalid or expired token");
  }

  const { code } = req.params;

  try {
    const connection = await connect();
    const [rows]: any = await connection.execute(
      "SELECT * FROM players WHERE room_code = ? AND user_id = ? AND host = 1",
      [code, user_id]
    );
    debugPrint(
      `Fetched player with ID: ${user_id} for room with CODE: ${code}`
    );
    res.json(rows.length > 0); //return true se lenght > 0
  } catch (error) {
    debugPrint(
      `Error occurred while fetching player with ID: ${user_id} for room with CODE: ${code}`
    );
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Recupera le carte del tavolo di una stanza specifica.
 *
 * @returns Un array di carte del tavolo in formato JSON.
 *
 * @throws Restituisce un errore 500 se si verifica un problema durante l'esecuzione della query.
 *
 * @example "GET: /api/rooms/1/table_cards"
 */
export const getRoomTableCards = async (req: Request, res: Response) => {
  const { code } = req.params;
  try {
    const connection = await connect();
    const [rows]: any = await connection.execute(
      "SELECT * FROM table_cards WHERE room_code = ?",
      [code]
    );
    debugPrint(`Fetched table cards for room with CODE: ${code}`);
    debugPrint("Sending table cards data as JSON response");
    res.json(rows);
  } catch (error) {
    debugPrint(
      `Error occurred while fetching table cards for room with CODE: ${code}`
    );
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Ottiene la mano di un giocatore specifico in una stanza.
 *
 * @returns Una risposta JSON contenente la mano del giocatore.
 *
 * @throws Restituisce un errore 500 se si verifica un problema durante l'esecuzione della query.
 *
 * @example "GET: /api/rooms/1/players/1/hand"
 */
export const getPlayerHand = async (req: Request, res: Response) => {
  const { code, player_id } = req.params;
  try {
    const connection = await connect();
    const [rows]: any = await connection.execute(
      "SELECT * FROM hand_cards WHERE room_code = ? AND player_id = ?",
      [code, player_id]
    );
    debugPrint(
      `Fetched hand for player with ID: ${player_id} in room with CODE: ${code}`
    );
    debugPrint("Sending player hand data as JSON response");
    res.json(rows);
  } catch (error) {
    debugPrint(
      `Error occurred while fetching hand for player with ID: ${player_id} in room with CODE: ${code}`
    );
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Crea una nuova stanza con un codice univoco.
 *
 * @returns Una risposta HTTP che indica se la stanza è stata creata con successo
 *
 * @throws Restituisce una risposta HTTP con stato 500 se si verifica un errore durante la creazione della stanza.
 *
 * @example "POST: /api/rooms"
 */
export const createRoom = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    debugPrint("Authorization token is missing");
    return res.status(401).send("Authorization token is missing");
  }

  const user_id = getUserIdFromToken(token);
  if (!user_id) {
    debugPrint("Invalid or expired token");
    return res.status(401).send("Invalid or expired token");
  }

  try {
    let code: string = "";
    let unique = false;

    while (!unique) {
      code = generateCode();
      unique = await isCodeUnique(code);
    }

    const connection = await connect();
    // ? Creo la stanza con il codice generato e il giocatore che ha creato la stanza come giocatore attivo
    await connection.execute(
      "INSERT INTO rooms (code, turn_player_id) VALUES (?, ?)",
      [code, user_id]
    );
    debugPrint(`Created room with CODE: ${code} and user ID: ${user_id}`);
    // ? Aggiungo il giocatore che ha creato la stanza come host
    await connection.execute(
      "INSERT INTO players (room_code, user_id, host) VALUES (?, ?, ?)",
      [code, user_id, true]
    );
    debugPrint(`Player with ID: ${user_id} joined room with CODE: ${code}`);

    debugPrint("Sending room code as JSON response");
    res.json(code);
  } catch (error) {
    debugPrint("Error occurred while creating room");
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Elimina una stanza dal database.
 *
 * @param req - La richiesta HTTP contenente l'ID della stanza da eliminare nel corpo.
 * @param res - La risposta HTTP che verrà inviata al client.
 *
 * @returns Una risposta HTTP che indica se la stanza è stata eliminata con successo o se si è verificato un errore.
 *
 * @example "DELETE: /api/room/1/delete"
 */
export const deleteRoom = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    debugPrint("Authorization token is missing");
    return res.status(401).send("Authorization token is missing");
  }

  const { code } = req.params;
  try {
    const connection = await connect();
    await connection.execute("DELETE FROM rooms WHERE code = ?", [code]);

    debugPrint(`Deleted room with ID: ${code}`);
    res.send("Room deleted");
  } catch (error) {
    debugPrint(`Error occurred while deleting room with CODE: ${code}`);
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Aggiunge un giocatore a una stanza specificata.
 *
 * @param req - L'oggetto della richiesta, contenente i parametri della stanza e il corpo della richiesta con l'ID del giocatore.
 * @param res - L'oggetto della risposta, utilizzato per inviare la risposta al client.
 *
 * @returns Una promessa che risolve con un messaggio di conferma o un errore.
 *
 * @throws Restituisce un errore 500 se si verifica un problema durante l'inserimento del giocatore nella stanza.
 */
export const joinRoom = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    debugPrint("Authorization token is missing");
    return res.status(401).send("Authorization token is missing");
  }

  const user_id = getUserIdFromToken(token);
  if (!user_id) {
    debugPrint("Invalid or expired token");
    return res.status(401).send("Invalid or expired token");
  }

  const { code } = req.params;

  try {
    const connection = await connect();

    // ? Controlla il numero di giocatori nella stanza
    const [rows] = await connection.execute(
      "SELECT COUNT(*) as playerCount FROM players WHERE room_code = ?",
      [code]
    );
    const playerCount = rows[0].playerCount;

    // ? Alterna i team
    const team = playerCount % 2 === 0 ? 1 : 2;

    await connection.execute(
      "INSERT INTO players (room_code, user_id, team, host) VALUES (?, ?, ?, ?)",
      [code, user_id, team, 0]
    );

    debugPrint(
      `Player with ID: ${user_id} joined room with CODE: ${code} in team ${team}`
    );
    res.send("Player joined room");
  } catch (error) {
    debugPrint(
      `Error occurred while player with ID: ${user_id} tried to join room with CODE: ${code}`
    );
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Gestisce la richiesta per far uscire un giocatore da una stanza.
 *
 * @param id - L'ID della stanza.
 * @param player_id - L'ID del giocatore all' interno della stanza
 *
 * @returns Una risposta HTTP che indica se il giocatore ha lasciato la stanza con successo o se si è verificato un errore.
 *
 * @throws Restituisce una risposta HTTP con stato 500 se si verifica un errore durante l'operazione.
 *
 * @example "DELETE: /api/room/1/leave"
 */
export const leaveRoom = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    debugPrint("Authorization token is missing");
    return res.status(401).send("Authorization token is missing");
  }

  const user_id = getUserIdFromToken(token);
  if (!user_id) {
    debugPrint("Invalid or expired token");
    return res.status(401).send("Invalid or expired token");
  }

  const { code } = req.params;

  try {
    const connection = await connect();
    await connection.execute(
      "DELETE FROM players WHERE room_code = ? AND user_id = ?",
      [code, user_id]
    );

    debugPrint(`Player with ID: ${user_id} left room with CODE: ${code}`);
    res.send("Player left room");
  } catch (error) {
    debugPrint(
      `Error occurred while player with ID: ${user_id} tried to leave room with CODE: ${code}`
    );
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Avvia il gioco aggiornando lo stato della stanza a "in progress".
 *
 * @param id - L'ID della stanza.
 *
 * @returns Una risposta che indica se il gioco è stato avviato con successo o se si è verificato un errore.
 */
export const startGame = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    debugPrint("Authorization token is missing");
    return res.status(401).send("Authorization token is missing");
  }

  const user_id = getUserIdFromToken(token);
  if (!user_id) {
    debugPrint("Invalid or expired token");
    return res.status(401).send("Invalid or expired token");
  }

  const { code } = req.params;
  const deck = generateDeck();

  try {
    const connection = await connect();
    await connection.execute(
      "UPDATE players SET in_game = 1 WHERE room_code = ?",
      [code]
    );
    await connection.execute(
      'UPDATE rooms SET status = "in_progress" WHERE code = ?',
      [code]
    );

    for (let i = 0; i < deck.length; i++) {
      await connection.execute(
        "INSERT INTO deck (room_code, number, seed) VALUES (?, ?, ?)",
        [code, deck[i].number, deck[i].seed]
      );
    }

    debugPrint(`Game started for room with CODE: ${code}`);
    res.send(`Game started for room with CODE: ${code}`);
  } catch (error) {
    debugPrint(
      `Error occurred while starting game for room with CODE: ${code}`
    );
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Termina il gioco aggiornando lo stato della stanza a "ended".
 *
 * @param id - L'ID della stanza.
 *
 * @returns Una risposta HTTP che indica se il gioco è stato terminato con successo o se si è verificato un errore.
 *
 * @throws Restituisce uno stato 500 se si verifica un errore durante l'aggiornamento dello stato della stanza.
 */
export const endGame = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const connection = await connect();

    // Elimina le righe corrispondenti nella tabella hand_cards
    await connection.execute(
      "DELETE FROM hand_cards WHERE player_id IN (SELECT user_id FROM players WHERE room_code = ?)",
      [id]
    );

    await connection.execute('UPDATE rooms SET status = "ended" WHERE id = ?', [
      id,
    ]);
    res.send("Game ended successfully");
  } catch (error) {
    console.error("Error ending game:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Gioca una carta in una stanza specifica.
 *
 * @param card_id - L'ID della carta da giocare.
 *
 * @returns Una risposta che indica se la carta è stata giocata con successo o se si è verificato un errore.
 *
 * @throws Restituisce un errore 500 se si verifica un problema durante l'inserimento della carta nel database.
 *
 * @example "POST: /api/rooms/1/players/1/play/1"
 */
export const playCard = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    debugPrint("Authorization token is missing");
    return res.status(401).send("Authorization token is missing");
  }

  const player_id = getUserIdFromToken(token);
  if (!player_id) {
    debugPrint("Invalid or expired token");
    return res.status(401).send("Invalid or expired token");
  }

  const { code, number, seed } = req.params;
  try {
    const connection = await connect();
    await connection.execute(
      "INSERT INTO table_cards (room_code, player_id, number, seed) VALUES (?, ?, ?, ?)",
      [code, player_id, number, seed]
    );

    await connection.execute(
      "DELETE FROM hand_cards WHERE room_code = ? AND player_id = ? AND number = ? AND seed = ?",
      [code, player_id, number, seed]
    );

    debugPrint(
      `Player with ID: ${player_id} played card ${number}/${seed} in room with CODE: ${code}`
    );
    res.json({ number, seed });
  } catch (error) {
    debugPrint(
      `Error occurred while player with ID: ${player_id} tried to play card ${number}/${seed} in room with CODE: ${code}`
    );
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Passa il turno incrementando il valore del campo `turn` nella tabella `rooms` per l'ID specificato.
 *
 * @param req - L'oggetto della richiesta, contenente i parametri della richiesta.
 * @param res - L'oggetto della risposta, utilizzato per inviare la risposta al client.
 *
 * @returns Una risposta con un messaggio di conferma o un messaggio di errore in caso di fallimento.
 */
export const passTurn = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    debugPrint("Authorization token is missing");
    return res.status(401).send("Authorization token is missing");
  }

  const player_id = getUserIdFromToken(token);
  if (!player_id) {
    debugPrint("Invalid or expired token");
    return res.status(401).send("Invalid or expired token");
  }

  const { code } = req.params;

  try {
    const connection = await connect();

    const [rows]: any = await connection.execute(
      "SELECT user_id FROM players WHERE room_code = ?",
      [code]
    );
    if (rows.length === 0) {
      return res.status(404).send("Room not found");
    }

    const [turnPlayerResult]: any = await connection.execute(
      "SELECT turn_player_id FROM rooms WHERE code = ?",
      [code]
    );
    if (turnPlayerResult.length === 0) {
      return res.status(404).send("Room not found");
    }

    if(turnPlayerResult === player_id) {
      return res.status(403).send("It's not your turn");
    }

    const turn_player_id = turnPlayerResult[0].turn_player_id;
    let nextPlayer = rows[0].user_id;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i].user_id === turn_player_id) {
        console.log(`Player ID: ${turn_player_id} found at index: ${i}`);
        nextPlayer = rows[(i + 1) % rows.length].user_id; // Cicla all'inizio dell'array
        console.log(`Next player ID: ${nextPlayer}`);
        await connection.execute(
          "UPDATE rooms SET turn_player_id = ? WHERE code = ?",
          [nextPlayer, code]
        );
        console.log(
          `Turn passed from player ID: ${turn_player_id} TO ${nextPlayer} in room with CODE: ${code}`
        );
        return res.send("Turn passed");
      }
    }

    await connection.execute(
      "UPDATE rooms SET turn_player_id = ? WHERE code = ?",
      [nextPlayer, code]
    );
    console.log(`Turn passed for room with CODE: ${code}`);
    res.send("Turn passed");
  } catch (error) {
    console.error(`Error occurred while passing turn for room with CODE: ${code}`);
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};

/**
 * Estrae una carta casuale e la inserisce nella mano del giocatore specificato.
 *
 * @param req - L'oggetto della richiesta, contenente i parametri `id` (ID della stanza) e `player_id` (ID del giocatore).
 * @param res - L'oggetto della risposta, utilizzato per inviare la risposta al client.
 *
 * @returns Una risposta che indica se la carta è stata estratta con successo o se si è verificato un errore.
 *
 * @throws Restituisce un errore 500 se si verifica un problema durante l'estrazione della carta.
 */
export const drawCard = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    debugPrint("Authorization token is missing");
    return res.status(401).send("Authorization token is missing");
  }

  const player_id = getUserIdFromToken(token);
  if (!player_id) {
    debugPrint("Invalid or expired token");
    return res.status(401).send("Invalid or expired token");
  }

  const { code } = req.params;
  try {
    const connection = await connect();
    const [rows]: any = await connection.execute(
      "SELECT * FROM deck WHERE room_code = ? ORDER BY RAND() LIMIT 1",
      [code]
    );

    if (rows.length > 0) {
      const drawnCard = rows[0];
      await connection.execute(
        "INSERT INTO hand_cards (room_code, number, seed, player_id) VALUES (?, ?, ?, ?)",
        [code, drawnCard.number, drawnCard.seed, player_id]
      );
      await connection.execute("DELETE FROM deck WHERE id = ?", [drawnCard.id]);

      debugPrint(`Card drawn for room with CODE: ${code}`);
      return res.send(drawnCard);
    } else {
      return res.status(404).send("No cards left in the deck");
    }
  } catch (error) {
    debugPrint(`Error occurred while drawing card for room with CODE: ${code}`);
    console.error("Error details:", error);
    return res.status(500).send("An error occurred");
  }
};

export const giveUp = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    debugPrint("Authorization token is missing");
    return res.status(401).send("Authorization token is missing");
  }

  const player_id = getUserIdFromToken(token);
  if (!player_id) {
    debugPrint("Invalid or expired token");
    return res.status(401).send("Invalid or expired token");
  }

  const { code } = req.params;
  try {
    const connection = await connect();
    await connection.execute(
      "UPDATE players SET in_game = 0 WHERE room_code = ? AND user_id = ?",
      [code, player_id]
    );

    await connection.execute(
      "DELETE FROM players WHERE room_code = ? AND user_id = ?",
      [code, player_id]
    );

    debugPrint(
      `Player with ID: ${player_id} gave up in room with CODE: ${code}`
    );
    res.json(player_id);
  } catch (error) {
    debugPrint(
      `Error occurred while player with ID: ${player_id} tried to give up in room with CODE: ${code}`
    );
    console.error("Error details:", error);
    res.status(500).send("An error occurred");
  }
};
