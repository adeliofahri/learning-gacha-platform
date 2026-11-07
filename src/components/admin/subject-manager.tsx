"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, EmptyState } from "@/components/ui/misc";
import { apiFetch, errorMessage } from "@/lib/api-client";

type Subject = {
  id: string;
  name: string;
  questionCount: number;
  topics: { id: string; name: string }[];
};

export function SubjectManager({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<{ name: string }>({ defaultValues: { name: "" } });
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tambah mata pelajaran</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={form.handleSubmit(async ({ name }) => {
              setError(null);
              try {
                await apiFetch("/api/admin/subjects", { body: { name } });
                form.reset();
                router.refresh();
              } catch (e) {
                setError(errorMessage(e));
              }
            })}
          >
            <Input
              placeholder="Nama mata pelajaran"
              aria-label="Nama mata pelajaran"
              required
              minLength={2}
              {...form.register("name")}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Tambah
            </Button>
          </form>
          {error && (
            <Alert variant="error" className="mt-3">
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>
      {subjects.length === 0 ? (
        <EmptyState title="Belum ada mata pelajaran" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubjectCard({ subject }: { subject: Subject }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const topicForm = useForm<{ name: string }>({ defaultValues: { name: "" } });
  const renameForm = useForm<{ name: string }>({ defaultValues: { name: subject.name } });

  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);

  const topicRenameForm = useForm<{ name: string }>({
    defaultValues: { name: "" },
  });
  
  return (
    <Card>
      <CardHeader>
        <form
          className="flex gap-2"
          onSubmit={renameForm.handleSubmit(async ({ name }) => {
            setError(null);
            try {
              await apiFetch(`/api/admin/subjects/${subject.id}`, {
                method: "PATCH",
                body: { name },
              });
              router.refresh();
            } catch (e) {
              setError(errorMessage(e));
            }
          })}
        >
          <Input
            aria-label="Nama mata pelajaran"
            className="font-bold"
            {...renameForm.register("name")}
          />
          <Button type="submit" variant="outline" size="sm" className="h-10">
            Ubah
          </Button>
        </form>
        <p className="text-muted-foreground text-xs">{subject.questionCount} soal</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {subject.topics.length === 0 ? (
            <span className="text-muted-foreground text-sm">
              Belum ada topik.
            </span>
          ) : (
            subject.topics.map((t) => (
              <div key={t.id} className="flex items-center gap-1">
                {editingTopicId === t.id ? (
                  <form
                    className="flex items-center gap-1"
                    onSubmit={topicRenameForm.handleSubmit(async ({ name }) => {
                      setError(null);

                      try {
                        await apiFetch(`/api/admin/topics/${t.id}`, {
                          method: "PATCH",
                          body: { name },
                        });

                        setEditingTopicId(null);
                        topicRenameForm.reset();
                        router.refresh();
                      } catch (e) {
                        setError(errorMessage(e));
                      }
                    })}
                  >
                    <Input
                      aria-label={`Ubah nama topik ${t.name}`}
                      className="h-8 w-36"
                      required
                      minLength={2}
                      maxLength={80}
                      {...topicRenameForm.register("name")}
                    />

                    <Button
                      type="submit"
                      size="sm"
                      className="h-8"
                      disabled={topicRenameForm.formState.isSubmitting}
                    >
                      Simpan
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => {
                        setEditingTopicId(null);
                        topicRenameForm.reset();
                      }}
                    >
                      Batal
                    </Button>
                  </form>
                ) : (
                  <>
                    <Badge variant="secondary">{t.name}</Badge>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setError(null);
                        topicRenameForm.reset({ name: t.name });
                        setEditingTopicId(t.id);
                      }}
                    >
                      Ubah
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        <form
          className="flex gap-2"
          onSubmit={topicForm.handleSubmit(async ({ name }) => {
            setError(null);
            try {
              await apiFetch("/api/admin/topics", { body: { subjectId: subject.id, name } });
              topicForm.reset();
              router.refresh();
            } catch (e) {
              setError(errorMessage(e));
            }
          })}
        >
          <Input
            placeholder="Topik baru"
            aria-label={`Topik baru untuk ${subject.name}`}
            required
            minLength={2}
            {...topicForm.register("name")}
          />
          <Button type="submit" variant="secondary">
            Tambah topik
          </Button>
        </form>
        {error && <Alert variant="error">{error}</Alert>}
      </CardContent>
    </Card>
  );
}
