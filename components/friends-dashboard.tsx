"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UserLite = { id: string; name: string | null; email: string; image: string | null };
type FriendRequest = {
  id: string;
  sender: UserLite;
  receiver: UserLite;
};

type Challenge = {
  id: string;
  roomCode: string;
  senderId: string;
  receiverId: string;
  timeControl: "bullet" | "blitz" | "rapid" | "classical";
  accepted: boolean;
  sender: UserLite;
  receiver: UserLite;
};

const MODES = ["bullet", "blitz", "rapid", "classical"] as const;

export function FriendsDashboard({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [friends, setFriends] = useState<UserLite[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [modeByFriend, setModeByFriend] = useState<Record<string, Challenge["timeControl"]>>({});
  const [message, setMessage] = useState<string>("");

  const loadData = async () => {
    const [friendsRes, challengesRes] = await Promise.all([fetch("/api/friends"), fetch("/api/challenges")]);

    if (friendsRes.ok) {
      const payload = (await friendsRes.json()) as {
        friends: UserLite[];
        users: UserLite[];
        incoming: FriendRequest[];
        outgoing: FriendRequest[];
      };
      setFriends(payload.friends);
      setUsers(payload.users);
      setIncoming(payload.incoming);
      setOutgoing(payload.outgoing);
    }

    if (challengesRes.ok) {
      const payload = (await challengesRes.json()) as { challenges: Challenge[] };
      setChallenges(payload.challenges);
    }
  };

  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      loadData().catch((error) => {
        console.error(error);
        setMessage("Failed to load friends data.");
      });
    }, 0);

    return () => window.clearTimeout(initTimer);
  }, []);

  const sendFriendRequest = async (receiverId: string) => {
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId }),
    });
    const payload = await res.json();
    setMessage(payload.error ?? "Friend request sent.");
    await loadData();
  };

  const respondRequest = async (requestId: string, action: "ACCEPT" | "DECLINE") => {
    const res = await fetch("/api/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });
    const payload = await res.json();
    setMessage(payload.error ?? `Request ${action.toLowerCase()}ed.`);
    await loadData();
  };

  const sendChallenge = async (receiverId: string) => {
    const timeControl = modeByFriend[receiverId] ?? "blitz";
    const res = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId, timeControl }),
    });
    const payload = await res.json();
    setMessage(payload.error ?? `Challenge sent (${timeControl}).`);
    await loadData();
  };

  const respondChallenge = async (challengeId: string, accept: boolean) => {
    const res = await fetch("/api/challenges", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, accept }),
    });

    const payload = await res.json();

    if (payload.challenge?.roomCode && accept) {
      router.push(`/game/${payload.challenge.roomCode}`);
      return;
    }

    setMessage(payload.error ?? "Challenge response saved.");
    await loadData();
  };

  const availableUsers = useMemo(() => users.filter((user) => !friends.some((friend) => friend.id === user.id)), [users, friends]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={loadData} className="rounded-md border border-slate-500 px-3 py-1.5 text-sm hover:border-slate-200">
          Refresh
        </button>
        {message ? <p className="rounded-md border border-emerald-600/40 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}
      </div>

      <section className="rounded-xl border border-slate-700 bg-[#272522] p-4">
        <h2 className="text-lg font-bold text-white">Incoming friend requests</h2>
        <div className="mt-3 space-y-2 text-sm">
          {incoming.length ? (
            incoming.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-600 bg-slate-800/50 p-3">
                <span>{request.sender.name ?? request.sender.email}</span>
                <div className="flex gap-2">
                  <button onClick={() => respondRequest(request.id, "ACCEPT")} className="rounded-md bg-green-700 px-3 py-1.5 text-white">
                    Accept
                  </button>
                  <button onClick={() => respondRequest(request.id, "DECLINE")} className="rounded-md bg-rose-700 px-3 py-1.5 text-white">
                    Decline
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-400">No incoming requests.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-[#272522] p-4">
        <h2 className="text-lg font-bold text-white">Friends list</h2>
        <div className="mt-3 space-y-2 text-sm">
          {friends.length ? (
            friends.map((friend) => (
              <div key={friend.id} className="grid gap-2 rounded-md border border-slate-600 bg-slate-800/50 p-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                <span>{friend.name ?? friend.email}</span>
                <select
                  value={modeByFriend[friend.id] ?? "blitz"}
                  onChange={(event) => setModeByFriend((prev) => ({ ...prev, [friend.id]: event.target.value as Challenge["timeControl"] }))}
                  className="rounded-md border border-slate-500 bg-slate-900 px-2 py-1"
                >
                  {MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
                <button onClick={() => sendChallenge(friend.id)} className="rounded-md bg-[#81b64c] px-3 py-1.5 font-semibold text-[#1d2f16]">
                  Challenge
                </button>
              </div>
            ))
          ) : (
            <p className="text-slate-400">You have no friends yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-[#272522] p-4">
        <h2 className="text-lg font-bold text-white">Challenge inbox</h2>
        <div className="mt-3 space-y-2 text-sm">
          {challenges.filter((item) => item.receiverId === currentUserId && !item.accepted).length ? (
            challenges
              .filter((item) => item.receiverId === currentUserId && !item.accepted)
              .map((challenge) => (
                <div key={challenge.id} className="rounded-md border border-slate-600 bg-slate-800/50 p-3">
                  <p>
                    {challenge.sender.name ?? challenge.sender.email} challenged you ({challenge.timeControl})
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => respondChallenge(challenge.id, true)} className="rounded-md bg-green-700 px-3 py-1.5">
                      Accept
                    </button>
                    <button onClick={() => respondChallenge(challenge.id, false)} className="rounded-md bg-rose-700 px-3 py-1.5">
                      Decline
                    </button>
                  </div>
                </div>
              ))
          ) : (
            <p className="text-slate-400">No incoming challenges.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-[#272522] p-4">
        <h2 className="text-lg font-bold text-white">Find players</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          {availableUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-md border border-slate-600 bg-slate-800/50 p-3">
              <span>{user.name ?? user.email}</span>
              <button onClick={() => sendFriendRequest(user.id)} className="rounded-md border border-slate-400 px-2 py-1 hover:border-slate-100">
                Add
              </button>
            </div>
          ))}
          {!availableUsers.length ? <p className="text-slate-400">No new players available right now.</p> : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-[#272522] p-4 text-sm text-slate-300">
        <p>Outgoing friend requests: {outgoing.length}</p>
        <p>Open challenges sent: {challenges.filter((item) => item.senderId === currentUserId && !item.accepted).length}</p>
        {challenges.filter((item) => item.accepted).length ? (
          <div className="mt-2 space-y-1">
            {challenges
              .filter((item) => item.accepted)
              .map((challenge) => (
                <Link key={challenge.id} href={`/game/${challenge.roomCode}`} className="block underline">
                  Enter live room {challenge.roomCode}
                </Link>
              ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
