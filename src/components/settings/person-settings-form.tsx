"use client";

import { UserPlus, Users } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useVocabularyData } from "@/components/vocabulary/use-vocabulary-data";
import { getActivePeople, getSelectedPerson } from "@/lib/people/repository";
import { addPerson, selectPerson } from "@/lib/vocabulary/repository";
import { PressableButton } from "@/components/ui/motion-primitives";

export function PersonSettingsForm() {
  const { data, isLoaded, commit } = useVocabularyData();
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const activePeople = getActivePeople(data);
  const selectedPerson = getSelectedPerson(data);

  const handleSelect = async (personId: string) => {
    try {
      const nextData = selectPerson(data, personId);

      await commit(nextData, {
        type: "people.select",
        personId,
      });
      setMessage(`Switched to ${getSelectedPerson(nextData).displayName}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not switch person");
    }
  };

  const handleAddPerson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const input = {
        displayName,
      };
      const result = addPerson(data, input);

      await commit(result.data, {
        type: "people.add",
        input,
      });
      setDisplayName("");
      setMessage(`Added and switched to ${result.person.displayName}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add this person");
    }
  };

  return (
    <div className="grid gap-4 md:max-w-md">
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-[#203229]">Current person</span>
        <select
          value={selectedPerson.id}
          disabled={!isLoaded}
          onChange={(event) => void handleSelect(event.target.value)}
          className="mimi-input px-3 text-base disabled:opacity-60"
        >
          {activePeople.map((person) => (
            <option key={person.id} value={person.id}>
              {person.displayName}
            </option>
          ))}
        </select>
      </label>

      <form className="grid gap-2" onSubmit={handleAddPerson}>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[#203229]">Add person</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Name"
            className="mimi-input px-3 text-base"
          />
        </label>
        <PressableButton
          type="submit"
          disabled={!displayName.trim()}
          className="mimi-button mimi-focus-ring inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus aria-hidden="true" className="size-4" />
          Add and switch
        </PressableButton>
      </form>

      <div className="rounded-md border border-[#d8d1c2] bg-[#efe9dc] p-3 text-sm text-[#5f6d62]">
        <p className="inline-flex items-center gap-2 font-semibold text-[#203229]">
          <Users aria-hidden="true" className="size-4" />
          {activePeople.length} {activePeople.length === 1 ? "person" : "people"}
        </p>
        <p className="mt-1">只切换学习数据，不是账号或密码隔离。</p>
      </div>

      {message ? <p className="rounded-md bg-[#d9e5d5] px-3 py-2 text-sm text-[#274331]">{message}</p> : null}
    </div>
  );
}
