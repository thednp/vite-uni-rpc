import van from "vanjs-core";
import { list } from "vanjs-ext"
import { compact, reactive } from "vanjs-ext";
import { useSubmission } from "./src/client";
import { createResource } from "./experiments/resource";
import { unwrap } from "vite-plugin-vanjs/router";
import { createAsync } from "./experiments/async";

type Todo = {
	"userId": number;
	"id": number;
	"title": string;
	"completed": boolean;
};

type User = {
	"id": number;
	"name": string;
	"username": string;
	"email": string;
	"address": {
		"street": string;
		"suite": string;
		"city": string;
		"zipcode": string;
		"geo": {
			"lat": string;
			"lng": string;
		};
	};
	"phone": string;
	"website": string;
	"company": {
		"name": string;
		"catchPhrase": string;
		"bs": string;
	};
};

// const fetchTodos = new Promise<Response>((res, rej) => {
// 	setTimeout(() => {
// 		fetch("https://jsonplaceholder.typicode.com/todos")
// 			.then(handleResponseErrors)
// 			.then(r => res(r))
// 			// .catch((er) => rej(er));
// 	}, 1500);
// });

const fetchUsers = (): Promise<Response> => {
	// Wrap in a new Promise to add the delay
	return new Promise((resolve, reject) => {
		setTimeout(async () => {
			try {
				const response = await fetch(
					"https://jsonplaceholder.typicode.com/userss",
				);

				resolve(response);
			} catch (error) {
				reject(error);
			}
		}, 1500);
	});
};

const classicFetch = fetch("https://jsonplaceholder.typicode.com/users");

// const fetchUsers = async (): Promise<User[]> => {
//   const response = await fetch("https://jsonplaceholder.typicode.com/users");
//   const checkedResponse = handleResponseErrors(response);
//   return checkedResponse.json();
// };

const sampleData = [
	{
		"id": 1,
		"name": "Leanne Graham",
		"username": "Bret",
		"email": "Sincere@april.biz",
		"address": {
			"street": "Kulas Light",
			"suite": "Apt. 556",
			"city": "Gwenborough",
			"zipcode": "92998-3874",
			"geo": {
				"lat": "-37.3159",
				"lng": "81.1496",
			},
		},
		"phone": "1-770-736-8031 x56442",
		"website": "hildegard.org",
		"company": {
			"name": "Romaguera-Crona",
			"catchPhrase": "Multi-layered client-server neural-net",
			"bs": "harness real-time e-markets",
		},
	},
	{
		"id": 2,
		"name": "Ervin Howell",
		"username": "Antonette",
		"email": "Shanna@melissa.tv",
		"address": {
			"street": "Victor Plains",
			"suite": "Suite 879",
			"city": "Wisokyburgh",
			"zipcode": "90566-7771",
			"geo": {
				"lat": "-43.9509",
				"lng": "-34.4618",
			},
		},
		"phone": "010-692-6593 x09125",
		"website": "anastasia.net",
		"company": {
			"name": "Deckow-Crist",
			"catchPhrase": "Proactive didactic contingency",
			"bs": "synergize scalable supply-chains",
		},
	},
];

const fakeFetchUsers = (): Promise<User[]> => {
	// Wrap in a new Promise to add the delay
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(sampleData), 1500);
	});
};

// const values = () => createAsync(async () => await fakeFetchUsers())

const App = () => {
	// const users = createAsync(async() => await classicFetch);
	// const users = createAsync(() => fetchUsers());
	// const [users, userActions] = createResource<User[]>(classicFetch);
	// const [users, userActions] = createResource<User[]>(fakeFetchUsers);
	const [users, userActions] = createResource<User[]>(fetchUsers, {
		initialValue: [],
	});
	// const [users, userActions] = createResource<User[]>(values());
	// console.log(todo, actions)
	const { div, h1, h2, p, a, button, form, input, strong } = van.tags;

	return [
		div(
			{ id: "users-wrapper" },
			div(
				{ style: "display: flex; flex-direction: row; gap: 1rem; margin: 1rem 0" },
				h1({ style: "line-height: 1; margin: 0" }, "Users"),
				button({
					type: "button",
					disabled: () => users.loading,
					onclick: userActions.refetch
				}, "Refetch"),
			),
			() => users.loading ? div({ class: "loading" }, "Loading...")
			: users.error ? div({ class: "error" }, users.error)

		: users?.latest?.length && list(div({ class: "users"}), users.latest, ({ val: user }) => {
			// const user = userState.val;
			return div(
				{ id: "user-" + user.id },
				h2(user.name),
				p(strong("UserName"), ": " + user.username),
				p(
					strong("Email"),
					": ",
					a({ href: `mailti:${user.email}` }, user.email),
				),
				p(
					strong("Address"),
					": ",
					user.address.street,
					", ",
					user.address.suite,
					", ",
					user.address.city,
				),
				p(
					strong("Company"),
					": ",
					a({
						href: user.website.startsWith("https")
							? user.website
							: "https://" + user.website,
					}, user.company.name),
				),
			)
		}),
		form(
			{ id: "exampleForm", action: "echo", method: "post" },
			input({ type: "text", name: "example", required: "" }),
			button({ type: "submit" }, "Submit"),
		),
	)];
};

van.add(document.getElementById("app")!, App());

document.getElementById("exampleForm")!.addEventListener(
	"submit",
	useSubmission("echo"),
);
