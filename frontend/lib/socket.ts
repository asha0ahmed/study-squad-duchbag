import { io, type Socket } from "socket.io-client";
import { BASE_URL, getToken } from "./api";

let socket: Socket | null = null;

/**
 * One shared Socket.io connection per browser tab, used for realtime
 * Squad Notes chat push (see app/squad/notes/page.tsx). This replaces
 * what used to be a `setInterval` polling GET /squads/:squadId/messages
 * every few seconds from every open chat tab, whether or not anyone was
 * actually typing -- that recurring request was the main thing limiting
 * how much chat traffic the backend could take.
 *
 * Created lazily (not at module load) since connecting requires a JWT
 * that only exists once the user is logged in; `auth` is a callback
 * rather than a plain object so it re-reads the current token from
 * localStorage on every (re)connect attempt, not just the first one.
 * Starts disconnected (`autoConnect: false`) -- callers explicitly
 * `.connect()` when a chat screen mounts and `.disconnect()` when it
 * unmounts, so a tab that never opens Squad Notes never opens a socket.
 */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(BASE_URL, {
    autoConnect: false,
    auth: (cb) => cb({ token: getToken() }),
  });
  return socket;
}
