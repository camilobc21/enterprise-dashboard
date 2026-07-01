import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MOCK_USERS = [
  {
    id: "1",
    name: "Camilo Barrios",
    email: "camilo@example.com",
    role: "admin" as const,
  },
  {
    id: "2",
    name: "Juan García",
    email: "juan@example.com",
    role: "user" as const,
  },
  {
    id: "3",
    name: "María López",
    email: "maria@example.com",
    role: "user" as const,
  },
  {
    id: "4",
    name: "Carlos Rodríguez",
    email: "carlos@example.com",
    role: "admin" as const,
  },
];

export function UserSelector() {
  const [selectedUser, setSelectedUser] = useState("1");

  const handleSelectUser = () => {
    const user = MOCK_USERS.find((u) => u.id === selectedUser);
    if (user) {
      // Store selected user in sessionStorage
      sessionStorage.setItem("mockUser", JSON.stringify(user));
      // Reload page to apply new user
      window.location.reload();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Selector de Usuario (Desarrollo)</CardTitle>
        <CardDescription>
          Elige un usuario de prueba para acceder al dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un usuario" />
          </SelectTrigger>
          <SelectContent>
            {MOCK_USERS.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="space-y-2 text-sm">
          {MOCK_USERS.map((user) => (
            <div key={user.id} className="p-2 bg-gray-100 rounded">
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-gray-600">{user.email}</div>
              <div className="text-xs text-gray-600">Rol: {user.role}</div>
            </div>
          ))}
        </div>

        <Button onClick={handleSelectUser} className="w-full">
          Iniciar Sesión como {MOCK_USERS.find((u) => u.id === selectedUser)?.name}
        </Button>
      </CardContent>
    </Card>
  );
}
