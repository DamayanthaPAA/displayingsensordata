"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const NewUser = () => {
  const [user, setUser] = useState({
    name: "",
    lastname: "",
    email: "",
    password: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const router = useRouter();
  const params = useParams();

  const getUser = async () => {
    const res = await fetch(`/api/users/${params.id}`);
    const data = await res.json();
    setUser({
      name: data.name,
      lastname: data.lastname,
      email: data.email,
      password: "", // Do not show password
    });
  };

  useEffect(() => {
    if (params.id) {
      getUser();
    }
  }, []);

  const handleChange = (e) =>
    setUser({ ...user, [e.target.name]: e.target.value });

  const validate = () => {
    let errors = {};
    if (!user.name) errors.name = "First name is required";
    if (!user.lastname) errors.lastname = "Last name is required";
    if (!user.email) errors.email = "Email is required";
    if (!user.password && !params.id)
      errors.password = "Password is required";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    setIsSubmitting(true);

    if (params.id) {
      await updateUser();
    } else {
      await createUser();
    }

    router.push("/");
  };

  const createUser = async () => {
    try {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const updateUser = async () => {
    try {
      await fetch(`/api/users/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await fetch(`/api/users/${params.id}`, {
          method: "DELETE",
        });
        router.push("/");
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] flex justify-center items-center">
      <form onSubmit={handleSubmit}>
        <header className="flex justify-between">
          <h1 className="font-bold text-3xl">
            {!params.id ? "Create User" : "Update User"}
          </h1>
          {params.id && (
            <button
              className="bg-red-500 px-3 py-1 rounded-md"
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
        </header>

        <input
          type="text"
          placeholder="First name"
          name="name"
          value={user.name}
          onChange={handleChange}
          className="bg-gray-800 border-2 w-full p-4 rounded-lg my-4"
        />

        <input
          type="text"
          placeholder="Last name"
          name="lastname"
          value={user.lastname}
          onChange={handleChange}
          className="bg-gray-800 border-2 w-full p-4 rounded-lg my-4"
        />

        <input
          type="email"
          placeholder="Email"
          name="email"
          value={user.email}
          onChange={handleChange}
          className="bg-gray-800 border-2 w-full p-4 rounded-lg my-4"
        />

        {!params.id && (
          <input
            type="password"
            placeholder="Password"
            name="password"
            value={user.password}
            onChange={handleChange}
            className="bg-gray-800 border-2 w-full p-4 rounded-lg my-4"
          />
        )}

        <button className="bg-green-600 text-white font-semibold px-8 py-2 rounded-lg">
          {params.id ? "Update" : "Save"}
        </button>
      </form>
    </div>
  );
};

export default NewUser;
