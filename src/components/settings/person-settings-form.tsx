"use client";

import { UserPlus, Users } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useVocabularyData } from "@/components/vocabulary/use-vocabulary-data";
import { getActivePeople, getSelectedPerson } from "@/lib/people/repository";
import { addPerson, selectPerson } from "@/lib/vocabulary/repository";

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
      setMessage(`已切换到 ${getSelectedPerson(nextData).displayName}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "切换失败");
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
      setMessage(`已添加并切换到 ${result.person.displayName}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "添加失败");
    }
  };

  return (
    <div className="grid gap-4 md:max-w-md">
      <label className="grid gap-2">
        <span className="text-sm font-medium">Current person</span>
        <select
          value={selectedPerson.id}
          disabled={!isLoaded}
          onChange={(event) => void handleSelect(event.target.value)}
          className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 text-base outline-none focus:border-[#517056]"
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
          <span className="text-sm font-medium">Add private person</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Name"
            className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 text-base outline-none focus:border-[#517056]"
          />
        </label>
        <button
          type="submit"
          disabled={!displayName.trim()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#517056] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          <UserPlus aria-hidden="true" className="size-4" />
          添加并切换
        </button>
      </form>

      <div className="rounded-md bg-[#f8f7f4] p-3 text-sm text-[#66645c]">
        <p className="inline-flex items-center gap-2 font-medium text-[#464640]">
          <Users aria-hidden="true" className="size-4" />
          {activePeople.length} people
        </p>
        <p className="mt-1">私人项目内的数据切换，不是密码或安全隔离。</p>
      </div>

      {message ? <p className="text-sm text-[#517056]">{message}</p> : null}
    </div>
  );
}
